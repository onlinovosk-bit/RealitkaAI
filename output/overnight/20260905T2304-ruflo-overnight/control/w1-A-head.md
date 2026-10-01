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