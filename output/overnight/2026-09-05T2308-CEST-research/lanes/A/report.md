# Lane A — Repo truth / reuse

## Decisions
1. **Evolve existing Next.js + Supabase CRM** — do not greenfield Nest/new org model. Evidence: apps/crm is the production surface with 102 migrations, billing, Realvia ingest, crons.
2. **Reuse matrix is CODE_PRESENT-heavy; PROD_UNKNOWN for live Stripe/portal contracts** until founder confirms Production env.
3. **revolis-builder.mdc missing** — treat as doc drift; use Engineering Constitution for Integration Reports.

## Capability matrix (BASE cf3604613cdbb6a7a279e175f2c792fb25591461)

| Capability | Status | Evidence |
|---|---|---|
| Tenant agencies/profiles/auth | CODE_PRESENT + TEST_EVIDENCE | migrations RLS; tests/rls/; profiles guards 20260830/31 |
| Properties | CODE_PRESENT | supabase migrations + properties usage |
| Leads/contacts | CODE_PRESENT + TEST_EVIDENCE | leads lib; anon privilege revocation 20260827 |
| Deals | CODE_PRESENT (partial) | sales/ modules; PROD_UNKNOWN completeness |
| Viewings / scheduled_events | CODE_PRESENT | src/lib/scheduled-events; migration 20260527143000_event_scheduler_phase1.sql |
| Activities | CODE_PRESENT (partial) | workflows/routines; depth PROD_UNKNOWN |
| Billing / seat-cockpit-credits | CODE_PRESENT | program-tier-pricing.ts; docs/pricing-v1.md; api/billing; cron credits-* |
| Phone audit path | CODE_PRESENT uncertain | no strong phone_audit hit in quick grep; **UNKNOWN — needs dedicated search** |
| Portal adapters | CODE_PRESENT (import-heavy) | lib/realvia, api/realvia, universal-import/realvia, api/integrations/portal; public nehnutelnosti route |
| Jobs/crons | CODE_PRESENT | ~27 cron routes under api/cron including realvia-process, notification-digest, customer-health |

## Stack snapshot
- next ^16.2.4, @supabase/*, maplibre-gl, zod, fast-xml-parser (package.json)

## Evidence
- apps/crm/package.json dependencies
- apps/crm/src/lib/program-tier-pricing.ts PLAN_PRICES_EUR solo 79 / team 71 / office 63
- apps/crm/docs/pricing-v1.md
- migration inventory 102 files; latest anon policy drops Sep 2026
- .cursor/rules/revolis-builder.mdc absent

## Assumptions
- BASE_SHA origin/main represents mergeable truth for research; dirty bridge-harness not authoritative.
- ICP 5–20 brokers is hypothesis for later lanes, not proven segment.

## Unknowns
- Production Stripe price IDs actually configured
- Whether phone reveal is audited end-to-end in prod
- Completeness of deals pipeline vs leads-only workflows
- Portal *export* (CRM→portal) vs Realvia *import* maturity

## Experiments
- Schema parity smoke: run existing RLS tests against preview — metric: pass rate; sample: CI; cost: CI minutes; stop if red on tenant isolation.

## Product Implications
- Reuse billing + Realvia import + scheduled-events; defer greenfield portal exporter until Lane C vendor access.
- Freeze tenant/RLS contracts before any parallel UI/adapters.

## Decision Memory Payload (DRAFT ONLY — not canonical)
- 2026-09-05: Overnight A — reuse Revolis CRM stack; no greenfield; builder rule path drift noted.