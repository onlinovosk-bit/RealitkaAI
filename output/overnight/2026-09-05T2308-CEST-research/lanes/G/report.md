# Lane G — Implementation backlog (specs only)

## Decisions
1. **No code tonight.** Backlog is future BO candidates after founder GO.
2. **Order:** (1) schema/tenant freeze owner (2) security primitives / phone audit verify (3) isolated UI/adapters after contracts (4) single integrator for routes/migrations/lockfile (5) E2E/RLS/portal contract tests.
3. **Portal export BO blocked** until UC docs (Lane C).
4. **Collision matrix:** migrations never parallel on same object; portal adapters own only their modules+fixtures.

## Candidate BOs (2–3 week pilot cut)

| ID | Title | Depends | Acceptance (tests) | External input |
|---|---|---|---|---|
| BO-P1 | Tenant/RLS freeze checklist + verification update | — | verification tests green | none |
| BO-P2 | Phone audit path verify/fix if gap | P1 | unit+RLS; no bypass | none |
| BO-P3 | Listing/property field honesty for pilot import | P1 | no invented fields | sample feed |
| BO-P4 | Pilot onboarding checklist UI (reuse onboarding) | P1 | smoke | none |
| BO-P5 | Portal export adapter | P1+UC docs | contract tests | UC sandbox |
| BO-P6 | Billing Stripe env truth check (docs only / ops) | — | founder checklist | Vercel env |

Write-sets for code TBD from Lane A paths at implementation time — do not invent file lists now beyond known dirs (billing, realvia, scheduled-events, rls tests).

## Constitution note
- Timing: portal export may be right product but **too early** without vendor docs → backlog
- Payment: pilot hypothesis may be VALIDATE until WTP experiment

## Evidence
- A/D/E/C lanes

## Unknowns
- Exact phone audit code path
- UC docs ETA

## Experiments
- After GO: BO-P1 only first PR

## Product Implications
- Swarm must not auto-start implementation

## Decision Memory Payload (DRAFT)
- 2026-09-05: Spec backlog P1–P6; P5 blocked on UC.