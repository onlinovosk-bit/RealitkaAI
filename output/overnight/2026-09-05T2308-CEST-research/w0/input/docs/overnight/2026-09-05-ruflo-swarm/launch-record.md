# Launch record — Ruflo overnight 2026-09-05

**Status: `STARTED`** (W0 READY)

| Field | Value | Notes |
|---|---|---|
| package_path | docs/overnight/2026-09-05-ruflo-swarm/ | Fixed |
| status | STARTED | After W0 READY |
| scope | research_and_specs | ASSUMED (founder GO without implementation) |
| start_at | 2026-09-05 23:08:00 +02:00 | Europe/Bratislava wall clock |
| start_at_utc | 2026-09-05T21:08:00Z | Derived |
| deadline_at | 2026-09-06 07:00:00 +02:00 | ASSUMED morning handoff |
| deadline_at_utc | 2026-09-06T05:00:00Z | Derived |
| timezone | Europe/Bratislava | ASSUMED |
| provider_policy | subscription-only / no automatic paid API escalation | ASSUMED |
| spend_cap | subscription_only | ASSUMED |
| concurrency | 1 orch + 3 workers; max 1 repair cycle K; last 15% for amendments+O6 | ASSUMED |
| runner | Cursor agent (Composer): repo read + web search/fetch + docs write | Best available; NOT ruflo-model-bridge V0 |
| models | Cursor subscription session models | No silent paid API escalation |
| base_sha | cf3604613cdbb6a7a279e175f2c792fb25591461 | origin/main after fetch (W0) |
| run_id | 2026-09-05T2308-CEST-research | |
| output_root | output/overnight/2026-09-05T2308-CEST-research/ | |
| authorized_by | Founder message: GO Ruflo Swarm Now! | Explicit |
| authorized_at | 2026-09-05 ~23:07 +02:00 | Session wall clock |
| prep_sibling | ec7468af-e32d-410e-a60d-e8a6dd2fe489 | Package completed by launch agent |

## ASSUMED fields (founder may override)
scope, deadline_at, provider_policy, spend_cap, concurrency, time reserve — documented as ASSUMED per launch defaults.