# Build Package — Guardian v1 Blok C

**Cieľová cesta:** `docs/briefs/build-package-guardian-v1-blok-c.md`  
**Brief:** `docs/briefs/overnight/overnight-brief-guardian-v1.md`  
**Premortem:** `docs/premortems/2026-07-27-guardian-v1.md`

## 1. VISION & BUSINESS

Maklérske agentúry strácajú obchody na „zabudnutých“ leadoch (Smolko: stovky kontaktov). Guardian hodinovo kontroluje pipeline podľa štyroch pravidiel a raz denne (voliteľne) pošle súhrn bez PII. User story: vedúci vidí počty nálezov a link do CRM, nie paniku z 300 mien v emaile.

## 2. SPEC

1. R1–R4 pravidlá podľa briefu s prahmi v `apps/crm/src/lib/guardian/config.ts`.
2. Vercel cron `guardian-run` (hodinovo) + `guardian-digest` (07:00).
3. Idempotencia: partial unique index + insert s ignorovaním 23505.
4. Auto-resolve pri behu runnera.
5. Prvý beh agentúry = **baseline** (nálezy áno, digest nie); `GUARDIAN_DIGEST_ENABLED` default **false**.
6. Digest: počty per pravidlo + CRM link; žiadne osobné údaje leadov.
7. Badge: `GET /api/guardian/open-summary` (open counts + lastRunAt).
8. Platform heartbeat: `guardianLastRunAt`, `guardianOpenFindings`, signál `guardian_runner_stale_2h`.

## 3. ARCHITECTURE

| Integrácia | Cesta |
|------------|--------|
| Runner | `apps/crm/src/lib/guardian/runner.ts` |
| Pravidlá (pure) | `apps/crm/src/lib/guardian/rules.ts` |
| Aktívne stavy | `apps/crm/src/lib/guardian/active-leads.ts` + `outcomeWriter.TERMINAL_LEAD_STATUSES` |
| Cron run | `apps/crm/src/app/api/cron/guardian-run/route.ts` |
| Cron digest | `apps/crm/src/app/api/cron/guardian-digest/route.ts` |
| Heartbeat | `apps/crm/src/lib/infra/platform-heartbeat.ts` |
| Scheduler | `apps/crm/vercel.json` — **Vercel cron**, nie n8n |

**Scope isolation:** žiadne zmeny v CRM lead status UI (PR-B2).

## 4. DATA

Plné SQL: `apps/crm/supabase/migrations/20260727120000_guardian_v1_blok_c.sql`  
Founder copy: `apps/crm/supabase/MIGRATION_guardian_v1_blok_c.sql`

Tabuľka `guardian_findings` + RLS tenant + service_role. **Migráciu nespúšťa CI** — founder GO.

## 5. API/UI

- `GET /api/cron/guardian-run` — CRON_SECRET
- `GET /api/cron/guardian-digest` — CRON_SECRET, env gate
- `GET /api/guardian/open-summary` — authenticated tenant

Bez úprav lead status modal/komponentov.

## 6. TESTING & ACCEPTANCE

- Unit: `apps/crm/src/lib/guardian/__tests__/guardian.test.ts`
- Cron auth: `apps/crm/src/app/api/cron/guardian-run/__tests__/route.test.ts`
- Verification: `apps/crm/tests/verification/guardian.verification.test.ts`
- RLS: `guardian_findings` v registry + fixtures
- DoD: CI lint/test/build, `npm run brain:check`, bez PROD migrácie, bez merge

## 7–11. PREMORTEM / ROLLBACK / MONITORING / MEMORY / RELEASE

Premortem: `docs/premortems/2026-07-27-guardian-v1.md`.

**Rollback:** odstrániť cron z `vercel.json`; `GUARDIAN_DIGEST_ENABLED=false`; kód revert; DB tabuľku nedorávať.

**Monitoring:** platform heartbeat riadok + `routine_notifications` typ `guardian_runner`.

**Release:** merge moat-capture → founder GO migrácia → deploy → baseline beh → founder prahy → digest ON.

---

## Morning report (Krok 0 + baseline)

### Call-sites / enum evidence

| Zdroj | Aktívne / terminálne stavy |
|-------|----------------------------|
| `apps/crm/src/lib/agents/followup/outcomeWriter.ts` — `TERMINAL_LEAD_STATUSES` | `Uzavretý`, `Stratený`, `Neaktívny`, `Archivovaný` |
| `apps/crm/src/app/api/cron/follow-up-sweep/route.ts` — `OPEN_STATUSES` | `Nový`, `Teplý`, `Horúci`, `Obhliadka`, `Ponuka` |
| Guardian `isActiveLeadStatus()` | **aktívny** = nie terminál (komplement terminálov) |

Aktivita pre R1/R4: `lead_events.created_at` (fallback `leads.updated_at` / `created_at`).

### Baseline plan

1. Deploy s cron + migrácia po founder GO.
2. Prvý `guardian-run` per agentúra: režim **baseline** (`routine_notifications.data.baselineComplete`).
3. Digest **vypnutý** (`GUARDIAN_DIGEST_ENABLED` unset/false).
4. Ak >50 nových nálezov v baseline → `ceo_command` na systémovú agentúru (founder review).
5. Po review founder nastaví prahy (env/kód) a zapne digest.

### MIGRATION.sql path

`apps/crm/supabase/MIGRATION_guardian_v1_blok_c.sql` (kópia pre PROD apply)

## ODCHÝLKY

1. **R3 CONTACT_REQUIRED** — len `Nový`, `Teplý`, `Horúci` (nie `Obhliadka`/`Ponuka`); konzervatívne, aby sa nespamovali neskoré fázy bez telefónu v DB.
2. **R4 aktivita** — primárne `lead_events`, sekundárne `leads.updated_at`; `last_contact` je voľný text, nepoužitý na rozhodnutie (nejasná parsovateľnosť).
3. **R2 owner** — `assigned_profile_id` null **a** `assigned_agent` prázdny alebo `Nepriradený` (z baseline schémy leads).
4. **last_run heartbeat** — stopa cez `routine_notifications` typ `guardian_runner` (platform run na `SYSTEM_USAGE_AGENCY_ID`), nie nová tabuľka mimo brief SQL.
5. **Baseline flag** — per-agentúra `baselineComplete` v `routine_notifications.data`, nie samostatný stĺpec v DB.
6. **PR-B2** — žiadna zmena lead status UI; badge len API `open-summary`.
