# Acquisition OS Stage 0 — NAJPRV ZISTI report

**Lane:** Ruflo LANE 3 (read-only)  
**Branch:** `docs/stage0-zisti` (from `origin/main`)  
**Scope:** ČASŤ 2 items 1–6 only — no app code, no migrations, no deploy  
**Investigated at:** 2026-08-11  
**Base commit:** `c32e841aa` (`origin/main`)

**Sources:**
- Spec: `docs/prompts/acquisition-os-stage0-execution.md`
- Blueprint: `docs/architecture/acquisition-os-v2.2-final-locked.md` (present in founder working tree; **not** on `origin/main` at investigation time — cite carefully)
- Migrations: `apps/crm/supabase/migrations/`
- Cron: `apps/crm/vercel.json`, `apps/crm/src/app/api/cron/**`
- n8n: `automation/n8n/`

Every claim below includes **file path + line**.

---

## 1. Existing schema: PK/FK — agencies, leads, activities, teams, profiles

### Verdict

| Table | PK | Key FKs | `UNIQUE(agency_id, id)` |
|-------|----|---------|-------------------------|
| `agencies` | `id uuid` | — | N/A (root tenant) |
| `leads` | `id text` | `agency_id → agencies(id)`, `team_id → teams(id)`, `assigned_profile_id → profiles(id)` | **NO** |
| `activities` | `id uuid` | `lead_id → leads(id)`, `profile_id → profiles(id)` | N/A (no `agency_id` column in baseline) |
| `teams` | `id uuid` | `agency_id → agencies(id)` NOT NULL | No composite `(agency_id, id)` unique |
| `profiles` | `id uuid` | `agency_id → agencies(id)` NOT NULL, `team_id → teams(id)` | No composite `(agency_id, id)` unique |

### Evidence — baseline create

**`leads`:** PK is legacy **text**, not uuid:

- `apps/crm/supabase/migrations/20260310_baseline_core_schema.sql` lines 7–8: `create table … leads ( id text primary key,`

**`activities`:** PK uuid; FK to `leads(id)`:

- same file lines 47–49: `id uuid primary key …`, `lead_id text references public.leads(id)`

**`agencies`:** lines 97–98 — `id uuid primary key`

**`teams`:** lines 122–124 — `id uuid primary key`, `agency_id uuid not null references public.agencies(id)`

**`profiles`:** lines 130–133 — `id uuid primary key`, `agency_id uuid not null references public.agencies(id)`, `team_id uuid references public.teams(id)`

**Tenant columns added to leads:** lines 148–151 — `agency_id`, `team_id`, `assigned_profile_id` FKs

**`activities.profile_id`:** lines 157–158

### Does `leads` have `UNIQUE(agency_id, id)`?

**No.** Repo-wide search of `apps/crm/supabase/migrations/**/*.sql` found **zero** matches for `UNIQUE (agency_id, id)` / `PRIMARY KEY (agency_id, id)`.

Supporting index is **non-unique** on `agency_id` only:

- `apps/crm/supabase/migrations/20260507160000_rls_leads_activities.sql` line 22: `CREATE INDEX IF NOT EXISTS idx_leads_agency_id ON public.leads (agency_id);`

### Blueprint impact (conflict — founder GO before “fixing”)

- Blueprint wants `FOREIGN KEY (agency_id, lead_id) REFERENCES leads(agency_id, id)` (acquisition_conversions) — requires unique on leads.
- Spec ZISTI #1: if missing → additive unique index (`docs/prompts/acquisition-os-stage0-execution.md` lines 51–53).
- **Type conflict:** blueprint `lead_id uuid` vs actual `leads.id text`. Existing children use `lead_id text` (e.g. `20260429111000_decision_intelligence_core.sql` lines 18, 32, 45, 59). Stage 0 must use **text**.
- **PR-S0.1 tension:** “no change to existing tables” (execution prompt line 82) vs additive unique needed — treat additive unique index as allowed when first composite FK lands.

---

## 2. Exact RLS on `leads` + `profile_agencies_for_auth()` signature

### Current `leads` policy (authoritative)

`apps/crm/supabase/migrations/20260616124500_rls_wave_a_leak_closure.sql` lines 13–17:

```sql
drop policy if exists "leads_tenant" on public.leads;
create policy "leads_tenant"
  on public.leads for all to authenticated
  using (agency_id in (select public.profile_agencies_for_auth()))
  with check (agency_id in (select public.profile_agencies_for_auth()));
```

Older Wave 11 (superseded) allowed `agency_id IS NULL`: `20260507160000_rls_leads_activities.sql` lines 8–19.

**Copy for Stage 0:** strict form (no NULL), matching leak-closure migration.

### `profile_agencies_for_auth()` signature

`apps/crm/supabase/migrations/20260419_enterprise_rls_profile_link.sql` lines 16–30:

```sql
create or replace function public.profile_agencies_for_auth()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct p.agency_id
  from public.profiles p
  where p.agency_id is not null
    and (
      p.auth_user_id = auth.uid()
      or p.id = auth.uid()
    );
$$;
```

Grants: lines 32–34 — revoke from public; grant execute to `authenticated` and `service_role`.

**Signature:** `() → SETOF uuid`, `STABLE`, `SECURITY DEFINER`, no args. No later replacement found.

Related: `20260508220000_rls_agencies_profiles_teams.sql` lines 10–45.

---

## 3. Where scheduled jobs live

### Primary: Vercel Cron → `/api/cron/*`

`apps/crm/vercel.json` lines 1–60 — crons include:

| Path | Schedule |
|------|----------|
| `/api/cron/pulse` | `0 0 * * *` |
| `/api/cron/bri-snapshot` | `0 2 * * *` |
| `/api/cron/seller-rescue` | `45 5 * * *` |
| `/api/cron/morning-brief` | `0 6 * * *` |
| `/api/cron/lead-ai-triage` | `0 5 * * *` |
| `/api/cron/follow-up-sweep` | `0 22 * * *` |
| `/api/cron/dashboard-insights` | `0 6 * * *` and `0 13 * * *` |
| `/api/cron/arbitrage-scan` | `0 3 * * *` |
| `/api/cron/price-trail-sync` | `30 4 * * *` |
| `/api/cron/heartbeat-check` | `0 7 * * *` |
| `/api/cron/guardian-run` | `0 6 * * *` |
| `/api/cron/guardian-digest` | `0 9 * * *` |
| `/api/cron/credits-cycle` | `0 5 1 * *` |

Handlers: `apps/crm/src/app/api/cron/<name>/route.ts` (25 routes; some not in vercel.json, e.g. `realvia-process`, external-cron invocable).

Auth example — `apps/crm/src/app/api/cron/pulse/route.ts` lines 10–14: `Authorization: Bearer ${CRON_SECRET}`.

Env: `apps/crm/src/config/env.ts` lines 80–81 — `CRON_SECRET: z.string().min(1)`.

### Secondary: n8n Cloud

`automation/n8n/` — W1/W2/W3 exports; `automation/n8n/README.md` lines 1–20. Sales/outreach/widget watchdog — **not** CRM Ads sync bus.

### Not for Stage 0

- No Redis/Bull product sync queue in repo.
- `import_jobs` table: `20260608120000_universal_crm_import.sql` line 8 — import-domain only.

**Stage 0:** reuse Vercel cron + Bearer CRON_SECRET (+ optional acquisition job table). No new queue system.

---

## 4. How secrets are stored today (no secret values)

| Mechanism | What | Evidence |
|-----------|------|----------|
| **Vercel Environment Variables** (primary) | `CRON_SECRET`, Supabase keys, Stripe, Google OAuth client secret, API keys | `apps/crm/.env.local.example` lines 1–6, 82; `apps/crm/src/config/env.ts` lines 8–10, 69–72, 81; `apps/crm/docs/stealth-recruiter-cron-setup.md` line 10 |
| **Postgres columns (service-role)** | Google OAuth refresh/access tokens | `20260424_google_calendar_oauth.sql` lines 3–11, 18–19; `google-calendar-server.ts` lines 48–57 |
| **Postgres JSON config** | IMAP password in `profile_integrations.config` | `integrations-store.ts` line 112 comment mentions vault; code upserts jsonb (no vault API) |
| **Hashed Realsoft credentials** | RPC resolver | `20260616103500_realsoft_auth_hash_hardening.sql` |
| **n8n credential store** | Workflow secrets | `automation/n8n/README.md` lines 7–9 |

**Not found:** HashiCorp Vault, AWS SM, GCP KMS, or Supabase Vault SQL for Ads.

**Stage 0 (PR-S0.2):** Vercel env for platform secrets + DB credential row / `credential_ref` (like `profile_google_calendar`). Do not introduce new vault product (`docs/prompts/acquisition-os-stage0-execution.md` lines 58–60).

---

## 5. Google Ads SA + domain-wide delegation feasibility

### Blueprint

Prefer service account; **OAuth per-client fallback locked** (blueprint §6.2). Spec ZISTI #5: if SA+DWD not feasible → OAuth + PR note (`docs/prompts/acquisition-os-stage0-execution.md` lines 61–65).

### Repo evidence

| Fact | Path + lines |
|------|----------------|
| Google = user OAuth (Calendar) | `api/integrations/google/auth/route.ts` 31–35; `callback/route.ts` 34–57; `google-calendar-server.ts` 110–121 |
| Env: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `config/env.ts` 68–73 |
| Tokens per `profile_id` | `20260424_google_calendar_oauth.sql` 3–7 |
| No Ads API client / SA / Workspace DWD config | rg empty for Ads SA/DWD in `apps/crm` |
| n8n Gmail OAuth | `automation/n8n/README.md` 26–27 |

### Verdict

**Workspace domain-wide delegation is not evidenced in-repo.** Ops/founder question. Ads SA also needs MCC user link in Google Ads UI — also unwired.

**Stage 0 recommendation:** use blueprint **OAuth fallback**. PR note: `service account odložený na Stage 1, dôvod: no Workspace DWD / Ads SA linking evidenced in repo; OAuth fallback per blueprint §6.2`. Not a blueprint change.

---

## 6. Prefix `acquisition_`?

| Area | Result |
|------|--------|
| `apps/crm/supabase/migrations/**/*.sql` | **No** matches |
| `apps/crm/src/**/*.{ts,tsx}` | **No** matches |

Planning-only mentions in docs/memory/brain (not schema).

**Name-adjacent:** `apps/crm/src/app/api/acquire/email/route.ts` + `lib/acquire/*` — prefix **`acquire`**, keep `/api/acquisition/...` distinct.

**Verdict:** no DB/API collision — `acquisition_*` names are free.

---

## Conflict protocol summary

| # | Conflict | Resolution |
|---|----------|------------|
| C1 | Blueprint uuid `lead_id` vs `leads.id text` | Use `text`; never rewrite leads PK |
| C2 | Missing `UNIQUE(agency_id, id)` on leads | Additive unique when first composite FK needed |
| C3 | PR-S0.1 “no existing table changes” vs C2 | Additive unique index = allowed exception |
| C4 | KMS vault vs Vercel/DB | Stage 0 = Vercel env + DB row |
| C5 | SA+DWD vs OAuth-only repo | Stage 0 OAuth fallback |

---

## Stage 0 implications (no code)

1. RLS: strict `leads_tenant` + `profile_agencies_for_auth()`.
2. Jobs: Vercel cron + `CRON_SECRET`.
3. Secrets: Vercel env + service-role DB; never log/LLM.
4. Auth: OAuth fallback until founder confirms SA+MCC (+ DWD if needed).
5. `acquisition_*` free.
6. Before `REFERENCES leads(agency_id, id)`: additive `UNIQUE (agency_id, id)`; `lead_id text`.

---

## Appendix — key paths

| Topic | Path |
|-------|------|
| Baseline schema | `apps/crm/supabase/migrations/20260310_baseline_core_schema.sql` |
| RLS function | `apps/crm/supabase/migrations/20260419_enterprise_rls_profile_link.sql` |
| leads RLS (current) | `apps/crm/supabase/migrations/20260616124500_rls_wave_a_leak_closure.sql` |
| Vercel crons | `apps/crm/vercel.json` |
| Cron routes | `apps/crm/src/app/api/cron/**/route.ts` |
| n8n | `automation/n8n/` |
| Env example | `apps/crm/.env.local.example` |
| Google OAuth | `apps/crm/src/app/api/integrations/google/**`, `apps/crm/src/lib/google-calendar-server.ts` |
| Stage 0 spec | `docs/prompts/acquisition-os-stage0-execution.md` |
