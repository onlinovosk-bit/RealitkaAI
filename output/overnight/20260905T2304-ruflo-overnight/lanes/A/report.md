# Lane A — Repo truth / reuse matrix

- **RUN_ID:** `20260905T2304-ruflo-overnight`
- **BASE_SHA:** `cf3604613cdbb6a7a279e175f2c792fb25591461`
- **Lane:** A (W1)
- **Status:** PASS_WITH_CONDITIONS
- **Accessed:** 2026-09-05 (repo via git show/grep at BASE_SHA; no live prod DB)

## Decisions

1. **Reuse existing CRM tenant core** (`agencies` / `teams` / `profiles` + Supabase Auth via `profiles.auth_user_id`). Do not invent a parallel organizations schema overnight.
2. **Treat leads as the contact surface** for CRM v1 reuse: there is **no** `public.contacts` table in the migration chain at BASE_SHA. Contact-like data lives on `leads` (+ `leads.dossier`, `enrichment_log` with `record_type='contact'`). A separate contacts entity would be NEW unless an Integration Report proves otherwise.
3. **Do not invent a classic `deals` CRM table.** Repo has AI/moat deal satellites (`ai_sourced_deals`, `deal_risk`, `deal_moments`, `deal_outcomes`) and lead-centric deal-strategy APIs — not a first-class deal pipeline entity.
4. **Viewings = reuse `scheduled_events`** (migration + `apps/crm/src/lib/scheduled-events/store.ts`). Prefer extending this over a new viewings table.
5. **Billing = reuse** `agencies` Stripe/credit columns + `credit_ledger` + `program-tier-pricing.ts` / `pricing-v1.md`. Production Stripe live state remains **PROD_UNKNOWN**.
6. **Phone audit is a real gap** for tenant call audit trail. Twilio appears as optional SMS/outbound; call-analyzer is UI/analysis. No dedicated phone-audit table found in migrations. Do not claim telephony audit as CODE_PRESENT for compliance.
7. **Portal adapters: IMPORT-heavy CODE_PRESENT** (Realvia, Realsoft, universal import, Nehnutelnosti scrape/arbitrage). Export/publish contracts belong to lane C — not invented here.
8. **Jobs = reuse** `import_jobs` / `import_rows` + `app/api/cron/*`. No need to introduce a new queue platform for overnight conclusions.
9. **C0/C1/C2 and SLA:** only draft definitions in `docs/briefs/l99-lead-factory-initiative.md`. **DRAFT / awaiting founder GO**, not shipped metrics. Do not treat chat estimates as definitions.
10. **Missing `.cursor/rules/revolis-builder.mdc`** at BASE_SHA; `apps/crm/AGENTS.md` still references it. Use `.cursor/rules/l99-engineering-constitution.mdc` for Integration Report / reuse tree.
11. **Baseline demo RLS is historical.** Later migrations harden anon/RLS. Do not cite 20260310 open anon policies as live vulnerability without later-chain + prod apply evidence (**PROD_UNKNOWN** for apply completeness).

**Change condition:** If a live prod schema dump or migration apply log contradicts this chain, reopen the matrix before architecture (lane D) locks a model.

## Evidence

### Method
- Migrations catalog: `output/overnight/20260905T2304-ruflo-overnight/w0/input/migrations_catalog/list.txt` (102 files).
- Contents pinned with `git show BASE_SHA:path` / `git grep`.
- Worktree HEAD may differ; capability claims are BASE_SHA-pinned.

### Capability matrix

| Capability | CODE_PRESENT | TEST_EVIDENCE | Documented / prod state | Key evidence paths |
|---|---|---|---|---|
| Agencies / profiles / auth | YES — tables + tenant link | Auth verification + register tests present | PROD_UNKNOWN | `20260310_baseline_core_schema.sql` agencies/teams/profiles; `20260508220000_rls_agencies_profiles_teams.sql`; profile guards 20260830/20260831; `20260728140000_profiles_platform_admin.sql` |
| Properties | YES | API + RLS migrations; some verification | PROD_UNKNOWN | baseline `properties`; `20260508180000_rls_properties.sql`; `apps/crm/src/app/api/properties/**` |
| Leads / contacts | YES leads; NO `contacts` table | Strong inbound/smoke/verification | PROD_UNKNOWN | baseline `leads`; dossier `20260614220000_add_leads_dossier.sql`; enrichment log `20260614213000_enrichment_log_and_contacts_dossier.sql`; `lib/import/contacts-import-core.ts` |
| Deals | PARTIAL satellites only | Thin (deal-strategy/agent); not CRM pipeline suite | PROD_UNKNOWN | `ai_sourced_deals`, `deal_risk`, `deal_moments`, `deal_outcomes`; API `leads/[id]/deal-strategy` |
| Viewings / scheduled_events | YES | Calendly/demo-ops tests; RLS fixtures include table | PROD_UNKNOWN usage | `20260527143000_event_scheduler_phase1.sql`; `src/lib/scheduled-events/store.ts` |
| Activities | YES | Feeds + tenant RLS; anon policies later dropped | PROD_UNKNOWN | baseline `activities`; `api/activities`; `20260904150000_drop_open_anon_policies.sql` |
| Billing | YES | `billing-credits.verification.test.ts`, webhook tests | PROD_UNKNOWN Stripe | `20260602_agency_billing_and_credits.sql`; `program-tier-pricing.ts`; `pricing-v1.md`; `api/billing/**` |
| Phone audit | GAP / WEAK | call-analyzer verification != CDR audit | PROD_UNKNOWN | twilio dep + env; call-analyzer pages; `ai_action_audit` is AI channel audit not phone CDR |
| Portal adapters | YES import/scrape; export unproven | Realsoft/import/arbitrage/Nehnutelnosti tests | PROD_UNKNOWN credentials | `api/realvia|realsoft|universal-import|integrations/portal`; `PortalNehnutelnostiSource.ts`; import_jobs source_system allowlist |
| Jobs | YES import_jobs + crons | Many cron/verification tests | PROD_UNKNOWN which crons enabled | `20260608120000_universal_crm_import.sql`; `app/api/cron/**` |

### Late-chain RLS (anti-false-alarm)
Baseline 20260310 created permissive `demo_*` anon policies. Later migrations add tenant RLS and drop/revoke anon (e.g. `20260507160000_rls_leads_activities.sql`, `20260827214500_leads_revoke_anon_table_privileges.sql`, `20260904150000_drop_open_anon_policies.sql`). Header of the 2026-09-04 drop migration claims production apply for its intent — **this lane did not re-verify live policies**.

### C0 / C1 / C2 / SLA (repo only)
From `docs/briefs/l99-lead-factory-initiative.md` section 2 (draft):
- **C0** Zachyteny — first-party submit + consent + allowlisted source
- **C1** Predhriaty — C0 + qualification + recorded personal contact attempt within SLA
- **C2** Kvalifikovany rozhovor — C1 + broker-recorded call outcome
- **SLA draft:** first attempt within 4 business hours (or next business morning) — marked PREDPOKLAD; awaits Smolko / founder GO

`docs/briefs/README.md` marks initiative DRAFT awaiting GO. Other C0/C1/C2 strings (archive overnight slots, Andy checklist, stage0 ZISTI IDs) are **different concepts** — do not conflate.

### Builder rule drift
- Referenced: `apps/crm/AGENTS.md` -> `.cursor/rules/revolis-builder.mdc`
- At BASE_SHA: **MISSING**
- Fallback: `.cursor/rules/l99-engineering-constitution.mdc` (reuse -> justification -> Judge)

### Smolko blockers
`docs/briefs/reality-smolko-production-blockers-2026-09-04.md` is an alias to the blocking-conditions register; not a live DB check.

## Assumptions

1. The BASE_SHA migration chain is the intended schema for CI/fresh DBs; prod may have extra loose SQL (noted for `integration_settings`).
2. Research_and_specs scope — CODE_PRESENT != customer-ready.
3. ICP 5-20 brokers is a START-HERE hypothesis, not proven demand.
4. `import_jobs.source_system` allowlist documents intended adapters; enum != certified production connector.

## Unknowns

| Unknown | Owner | Blocks |
|---|---|---|
| Migrations fully applied on prod/Smolko | Ops / founder | PROD readiness; residual RLS risk |
| Stripe live wiring | Billing owner | Lane E go-live claims |
| `scheduled_events` real usage | Product/analytics | Viewing priority |
| Phone CDR audit required for pilot? | Founder/legal/client | Lane D telephony invariants |
| Founder GO on C0/C1/C2 + SLA number | Founder + client | Lead Factory metrics |
| Portal publish/export contracts | Lane C + vendors | Multi-portal publish promises |
| Contacts-as-leads vs broker mental model | Product interview | Future `contacts` table |

## Experiments

1. **Schema parity (read-only):** prod table list vs migration CREATE set for core capabilities. Stop if critical core tables missing.
2. **Scheduled events usage:** count agencies with >=1 viewing/30d (aggregates only). Stop if zero -> deprioritize.
3. **Billing webhook health:** 14d success/error (ops). If unverifiable -> keep PROD_UNKNOWN.
4. **C0 definition GO:** founder accepts/edits lead-factory section 2; then instrument via existing `lead_events` / contact timestamps — no new table until reuse fails Integration Report.

## Product Implications

| Area | Reuse | Change | Defer |
|---|---|---|---|
| Tenant/auth | agencies/profiles | — | Parallel org model |
| CRM objects | leads, properties, activities, tasks | Clarify contacts=leads UX | New contacts table |
| Pipeline | lead status + tasks | — | Classic deals entity |
| Calendar/viewings | scheduled_events | Complete UI if pilot needs | New viewing schema |
| Money | pricing TS + credit_ledger | Align docs vs Stripe after verify | Rebuild pricing |
| Portals | import adapters | Lane C before export | Invented dual-write |
| Phone compliance | — | Define audit requirement | Claim audit done |
| Jobs | import_jobs + cron | Name pilot-critical crons | New queue platform |

**Real gaps:** no `contacts` table; no first-class `deals`; no phone audit store; portal export unproven; C0/C1/C2 not productized; all PROD_* unverified; revolis-builder rule missing.

## Decision Memory Payload (draft only)

Do **not** write to `memory/decisions.md` from this lane.

```text
date: 2026-09-05
source: ruflo-overnight lane A
run_id: 20260905T2304-ruflo-overnight
base_sha: cf3604613cdbb6a7a279e175f2c792fb25591461
decision: Evolve existing Revolis CRM (agencies/profiles/leads/properties/activities/scheduled_events/import_jobs/billing). No parallel org/contacts/deals overnight. Phone audit + portal export = gaps. C0/C1/C2 draft-only.
status: DRAFT_FOR_MORNING_INTEGRATION
reopen_if:
  - live schema dump contradicts migrations
  - founder rejects leads-as-contacts
  - pilot requires phone CDR audit
```
