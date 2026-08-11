# Acquisition OS Stage 0 — NAJPRV ZISTI Report

**Lane:** Ruflo LANE 3 (read-only)  
**Branch:** `docs/stage0-zisti`  
**Base:** `origin/main`  
**Spec:** `docs/prompts/acquisition-os-stage0-execution.md` ČASŤ 2 — items 1–6  
**Blueprint:** `docs/architecture/acquisition-os-v2.2-final-locked.md`  
**Scope:** investigation only — no app code, no migrations applied, no deploy  


> **Founder correction (L3 interpretation):** `leads` missing `UNIQUE(agency_id, id)` is **Odložené na Stage 2** — **not** a PR-S0.1 blocker. SA without Workspace DWD confirms blueprint path; **OAuth fallback not needed for Stage 0**.

Every claim below cites `path:line` (or path range) from the repo at investigation time.

---

## 1. Existing schema — PK/FK (agencies, leads, activities, teams, profiles)

### Source of truth

Core tables are defined in `apps/crm/supabase/migrations/20260310_baseline_core_schema.sql`.

### `public.leads`

| Item | Finding | Citation |
|------|---------|----------|
| PK | `id text primary key` (legacy text PK) | `20260310_baseline_core_schema.sql:7-8` |
| Tenant FK | `agency_id uuid references public.agencies(id) on delete set null` | `20260310_baseline_core_schema.sql:148-149` |
| Other FKs | `team_id → teams(id)`, `assigned_profile_id → profiles(id)` | `20260310_baseline_core_schema.sql:150-151` |
| **`UNIQUE(agency_id, id)`** | **DOES NOT EXIST** | Full-migrations scan: no `UNIQUE (agency_id, id)` on any table; leads only has non-unique `idx_leads_agency_id` (`20260507160000_rls_leads_activities.sql:22`) |

**Interpretation (Stage 0 vs later):** Missing `UNIQUE(agency_id, id)` on `leads` is **NOT a PR-S0.1 blocker**.

- That composite unique is required only for FKs like `FOREIGN KEY (agency_id, lead_id) REFERENCES leads(agency_id, id)` on **`acquisition_conversions`** (and similar) — those land in **Stage 2**, not Stage 0. Citations for the future FK: `docs/architecture/acquisition-os-v2.2-final-locked.md:234`, `:292`.
- Stage 0 creates **new** tables only (`acquisition_accounts`, `acquisition_campaigns`, `acquisition_events`). Composite FKs stay **between those new tables**, where we add `UNIQUE(agency_id, id)` ourselves.
- `acquisition_events.lead_id` is a **simple** FK (or nullable ref) to `leads(id)` — not a composite `(agency_id, lead_id)`.
- Stage 0 hard boundary: **žiadna zmena existujúcich tabuliek** → do **not** alter `leads` in PR-S0.1.

**Odložené na Stage 2:** additive `UNIQUE (agency_id, id)` (or partial unique where `agency_id IS NOT NULL`) on `public.leads` — only when conversions / composite lead FKs are built.

**Type note for PR-S0.1 (new tables only):** blueprint draft shows `lead_id uuid REFERENCES leads(id)` (`acquisition-os-v2.2-final-locked.md:196`) but live `leads.id` is **`text`** (`20260310_baseline_core_schema.sql:8`). On `acquisition_events`, use `text` to match live schema.

### `public.activities`

| Item | Finding | Citation |
|------|---------|----------|
| PK | `id uuid primary key default gen_random_uuid()` | `20260310_baseline_core_schema.sql:47-48` |
| FK | `lead_id text references public.leads(id) on delete cascade` | `20260310_baseline_core_schema.sql:49` |
| Extra FK | `profile_id uuid references public.profiles(id)` | `20260310_baseline_core_schema.sql:157-158` |
| No `agency_id` column | Tenant via lead join in RLS | `20260507160000_rls_leads_activities.sql:31-40` |

### `public.agencies`

| Item | Finding | Citation |
|------|---------|----------|
| PK | `id uuid primary key default gen_random_uuid()` | `20260310_baseline_core_schema.sql:97-98` |
| Unique | `slug text unique`; partial unique `(portal, external_id)` | `20260310_baseline_core_schema.sql:100`, `:118-120` |

### `public.teams`

| Item | Finding | Citation |
|------|---------|----------|
| PK | `id uuid primary key default gen_random_uuid()` | `20260310_baseline_core_schema.sql:122-123` |
| FK | `agency_id uuid not null references public.agencies(id) on delete cascade` | `20260310_baseline_core_schema.sql:124` |

### `public.profiles`

| Item | Finding | Citation |
|------|---------|----------|
| PK | `id uuid primary key default gen_random_uuid()` | `20260310_baseline_core_schema.sql:130-131` |
| FKs | `agency_id → agencies(id) NOT NULL`; `team_id → teams(id)` | `20260310_baseline_core_schema.sql:132-133` |
| Auth link | `auth_user_id uuid` + partial unique index | Baseline `:134`; reinforced `20260419_enterprise_rls_profile_link.sql:6-10` |
| Unique | `email text not null unique` | `20260310_baseline_core_schema.sql:136` |

### Verdict (item 1)

- Core PK/FK graph exists and is tenant-rooted at `agencies`.
- **`leads` does NOT have `UNIQUE(agency_id, id)`** — factual finding only.
- **PR-S0.1 may proceed immediately** without touching `leads`. Composite tenant FKs in Stage 0 are among **new** `acquisition_*` tables (self-owned `UNIQUE(agency_id, id)`).
- **Odložené na Stage 2:** unique index on `leads(agency_id, id)` for `acquisition_conversions` composite FK.
- For Stage 0 `acquisition_events.lead_id`, match live type: **`text`**, simple FK to `leads(id)`.


---

## 2. RLS on `leads` + `profile_agencies_for_auth()` signature

### Current authoritative `leads` policy

Wave A leak closure **replaced** the earlier NULL-tolerant policy:

```sql
create policy "leads_tenant"
  on public.leads for all to authenticated
  using (agency_id in (select public.profile_agencies_for_auth()))
  with check (agency_id in (select public.profile_agencies_for_auth()));
```

Citation: `apps/crm/supabase/migrations/20260616124500_rls_wave_a_leak_closure.sql:13-17`

Prior (superseded) form allowed `agency_id IS NULL`:  
`apps/crm/supabase/migrations/20260507160000_rls_leads_activities.sql:8-19`

**Copy this Wave A shape** for Stage 0 `acquisition_*` tables (no NULL agency escape hatch).

### `profile_agencies_for_auth()` exact signature

Citation: `apps/crm/supabase/migrations/20260419_enterprise_rls_profile_link.sql:16-34`

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

revoke all on function public.profile_agencies_for_auth() from public;
grant execute on function public.profile_agencies_for_auth() to authenticated;
grant execute on function public.profile_agencies_for_auth() to service_role;
```

No later migration redefines this function (only call-sites). Treat the above as the locked helper for Acquisition RLS.

---

## 3. Where scheduled jobs live

### Primary mechanism: Vercel Cron → Next.js `/api/cron/*`

Config: `apps/crm/vercel.json:2-60` — `crons[]` entries, e.g.:

| Path | Schedule | Citation |
|------|----------|----------|
| `/api/cron/pulse` | `0 0 * * *` | `vercel.json:4-7` |
| `/api/cron/bri-snapshot` | `0 2 * * *` | `vercel.json:8-11` |
| `/api/cron/seller-rescue` | `45 5 * * *` | `vercel.json:12-15` |
| `/api/cron/morning-brief` | `0 6 * * *` | `vercel.json:16-19` |
| `/api/cron/lead-ai-triage` | `0 5 * * *` | `vercel.json:20-23` |
| `/api/cron/follow-up-sweep` | `0 22 * * *` | `vercel.json:24-27` |
| `/api/cron/dashboard-insights` | `0 6` + `0 13` | `vercel.json:28-35` |
| `/api/cron/arbitrage-scan` | `0 3 * * *` | `vercel.json:36-39` |
| `/api/cron/price-trail-sync` | `30 4 * * *` | `vercel.json:40-43` |
| `/api/cron/heartbeat-check` | `0 7 * * *` | `vercel.json:44-47` |
| `/api/cron/guardian-run` | `0 6 * * *` | `vercel.json:48-51` |
| `/api/cron/guardian-digest` | `0 9 * * *` | `vercel.json:52-55` |
| `/api/cron/credits-cycle` | `0 5 1 * *` | `vercel.json:56-59` |

Handlers live under `apps/crm/src/app/api/cron/*/route.ts` (25 route files). Auth pattern example: `apps/crm/src/app/api/cron/pulse/route.ts:10-14` (`Authorization: Bearer $CRON_SECRET`).

`apps/marketing/vercel.json` has **no** crons (build-only config).

### Secondary: n8n (orchestration, not CRM sync workers)

Exports: `automation/n8n/`

| File | Role |
|------|------|
| `w1-follow-up-strazca.json` | Follow-up drafts |
| `w2-heartbeat-watchdog.json` | Widget HTTP watchdog |
| `w3-odpoved-detektor.json` | Gmail reply detector |

Rules: `automation/n8n/README.md:1-19` — credentials in n8n store, not repo. Product docs prefer **Vercel cron over n8n** for Guardian-class product jobs.

### Not present for Stage 0

- No Redis/Bull queue implementation for product sync workers in CRM app paths searched.
- Blueprint Redis/Bull = target state; Stage 0 should use **Vercel cron + DB job/status columns**.

### Stage 0 recommendation

Add sync worker(s) as new `/api/cron/acquisition-*` routes + entries in `apps/crm/vercel.json`, gated by `CRON_SECRET`. Do **not** introduce a new queue system in Stage 0.

---

## 4. How secrets are stored today

### Existing equivalent (closest to blueprint KMS/HashiCorp/AWS SM)

| Layer | Mechanism | Evidence |
|-------|-----------|----------|
| Runtime app secrets | **Vercel Environment Variables** (+ local `.env.local`) | `apps/crm/.env.local.example:1-6` |
| Cron auth | `CRON_SECRET` env | `.env.local.example:82`; used across cron routes |
| Supabase admin | `SUPABASE_SERVICE_ROLE_KEY` / publishable + URL | `.env.local.example:8-10`; RLS fixtures `apps/crm/tests/rls/fixtures.ts:49-52` |
| Google OAuth client | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (aliases `GOOGLE_OAUTH_*`) | `apps/crm/src/app/api/integrations/google/callback/route.ts:34-39` |
| Per-user Google tokens | **Postgres table** `profile_google_calendar` (service-role only) | `20260424_google_calendar_oauth.sql:4-19`; upsert `google-calendar-server.ts:48-57` |
| IMAP password comment | Comment claims “Supabase vault in prod” but storage is `profile_integrations.config` jsonb | `apps/crm/src/lib/integrations-store.ts:108-112` |
| n8n | n8n credential store (not in git) | `automation/n8n/README.md:7-8` |

### What is NOT in the repo

- No HashiCorp Vault / AWS Secrets Manager / GCP KMS client integration found in CRM app code.
- No Supabase Vault SQL in migrations scanned.
- Blueprint KMS (`acquisition-os-v2.2-final-locked.md:146`, `:877`) is aspirational.

### Stage 0 recommendation (PR-S0.2)

Use **nearest existing equivalent**:

1. **Platform secrets** (developer token, SA JSON or OAuth client secret): Vercel env vars — never commit, never log.
2. **Per-tenant credential pointer**: store `credential_ref` / encrypted blob following `profile_google_calendar` service-role-only pattern — not a new vault product.
3. Document in PR-S0.2: “KMS deferred; Vercel env + DB pointer = Stage 0 vault equivalent.”

**No secret values are included in this report.**

---

## 5. Google Ads service account vs domain-wide delegation / OAuth fallback

### Blueprint position

- Prefer **service account** for MCC-based access; **OAuth per-client** is locked fallback.  
  Citations: `acquisition-os-v2.2-final-locked.md:19`, `:442-446`, `:876-884`.

### Repo evidence of Google auth readiness

| Fact | Citation |
|------|----------|
| Google **OAuth** already wired for Calendar | `apps/crm/src/app/api/integrations/google/callback/route.ts` |
| Tokens persisted per profile | `20260424_google_calendar_oauth.sql`; `google-calendar-server.ts` |
| No Google Ads API client / SA wiring in CRM code | No `GOOGLE_ADS_*` in `.env.local.example`; no `/api/acquisition/*` routes |
| No documented Workspace Admin / domain-wide delegation config in repo | Docs mention `@revolis.ai` for product mail, not Ads DWD |

### Feasibility assessment

1. **Execution-prompt claim that SA “requires domain-wide delegation via Google Workspace” is outdated/imprecise for Google Ads API.** Current Google Ads docs: grant the service-account email access in Google Ads UI (Admin → Access and security), scope `https://www.googleapis.com/auth/adwords`; DWD/`sub` impersonation is not required when SA is invited directly to the MCC.
2. **For Stage 0 Test MCC:** SA is **feasible** without Workspace DWD — create SA in GCP, invite SA email to Test MCC (read-only), store JSON via Vercel env (item 4).
3. **Outcome for Stage 0:** SA without DWD is a clean win — **use SA**. OAuth remains a locked blueprint contingency only if SA invite/storage later becomes impossible; it is **not** the planned Stage 0 path.

### Stage 0 recommendation

- **Service account path confirmed** — invite SA to Test MCC; **no Workspace domain-wide delegation needed**.
- **OAuth fallback is not needed for Stage 0** (blueprint path is green). Keep Calendar OAuth infra as-is for its own product use; do not plan Ads OAuth unless SA ops later fail.
- Proceed with SA + Vercel env storage of the JSON key (founder-held; never in chat/repo).

---

## 6. Anything with prefix `acquisition_`?

### Code / migrations / schema

| Surface | Result |
|---------|--------|
| `apps/crm/supabase/migrations/*.sql` | **No** `acquisition_` tables/indexes/policies |
| `apps/crm/src/**/*.{ts,tsx}` | **No** `acquisition_` identifiers |
| `apps/crm/src/app/api/acquisition/**` | **Does not exist** |

### Docs / decisions only (planned names — not collisions)

Prefix appears in planning docs only, e.g.:

- `docs/architecture/acquisition-os-v2.2-final-locked.md`
- `docs/prompts/acquisition-os-stage0-execution.md`
- `memory/decisions.md` / `brain/decisions/decisions.md`

### Near-miss (not `acquisition_`)

- Route `apps/crm/src/app/api/acquire/email/route.ts` — prefix **`acquire`**, not `acquisition_`. No schema collision.

### `memory_events` note (for PR-S0.1 immutable pattern)

Execution prompt says copy `REVOKE UPDATE, DELETE FROM authenticated` “like memory_events”.  
`memory_events` exists as **ADR draft only** (`memory/adr-2026-07-28-memory-engine.md:482+`) — **no applied migration** with that REVOKE was found under `apps/crm/supabase/migrations/`. PR-S0.1 should implement REVOKE explicitly on `acquisition_events`.

### Verdict (item 6)

**No runtime/schema collision.** Safe to introduce `acquisition_*` tables/routes as planned.

---

## Cross-cutting conflicts to raise before code

| # | Conflict | Files | Proposed resolution |
|---|----------|-------|---------------------|
| C1 | Missing `UNIQUE(agency_id, id)` on `leads` | Baseline + indexes; blueprint `:234` | **Odložené na Stage 2** — not a Stage 0 / PR-S0.1 blocker. Needed only for `acquisition_conversions` composite FK. |
| C2 | Blueprint `lead_id uuid` vs `leads.id text` | Blueprint `:196`; baseline `:8` | On new `acquisition_events` only: use `text` simple FK. Do not alter `leads`. |
| C3 | Blueprint KMS vs repo Vercel env | Blueprint `:877`; `.env.local.example:1-6` | Stage 0 = Vercel env + DB pointer; no new vault |
| C4 | Queue Redis/Bull vs Vercel cron | Blueprint vs `vercel.json` | Stage 0 = cron + table; queue later |
| C5 | `memory_events` REVOKE “precedent” not in migrations | ADR only | Implement REVOKE on `acquisition_events` directly |

---

## Summary answers (executive)

1. **UNIQUE(agency_id, id) on leads?** → **No (factual).** **Not a Stage 0 blocker.** **Odložené na Stage 2** (for `acquisition_conversions`). PR-S0.1 can ship now without altering `leads`.
2. **RLS / helper** → `leads_tenant` = agency_id ∈ `profile_agencies_for_auth()`; function returns `setof uuid`, `stable`, `security definer`.
3. **Jobs** → **Vercel cron** (`apps/crm/vercel.json` + `/api/cron/*`); n8n secondary for outreach/watchdogs only.
4. **Secrets** → **Vercel env vars** (+ Postgres token tables); no KMS/Vault product in use.
5. **SA / DWD** → SA **confirmed without Workspace DWD**. **OAuth fallback not needed for Stage 0.**
6. **`acquisition_` collisions** → **None** in schema/code; docs-only planned names.

---

## Next implementation gate (out of this lane)

**PR-S0.1 is unblocked** on schema (additive cquisition_* only; no leads change).  
Human Day 1–2 credentials (Test MCC, developer token, SA JSON) remain blockers only for **live** Google Ads calls (PR-S0.2+), not for the migration PR.

