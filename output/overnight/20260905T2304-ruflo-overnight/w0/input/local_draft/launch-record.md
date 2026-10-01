# Launch record - Ruflo overnight 2026-09-05

**Status: LAUNCH_AUTHORIZED then STARTED after W0 PASS**

| Field | Value | Source |
|---|---|---|
| package_path | docs/overnight/2026-09-05-ruflo-swarm/ | fixed |
| status | STARTED | after W0 PASS |
| scope | research_and_specs ONLY | ASSUMED |
| start_at | 2026-09-05T23:04:08+02:00 | ASSUMED Europe/Bratislava |
| deadline_at | 2026-09-06T07:00:00+02:00 | ASSUMED |
| timezone | Europe/Bratislava | ASSUMED |
| provider_policy | subscription-only; max 1 orch + 3 workers; max 1 repair cycle K; reserve last 15% for K+O6 | ASSUMED |
| spend_cap | subscription_only | ASSUMED |
| runner | Cursor Composer orch + Task workers (repo read, web search/fetch). NOT ruflo-model-bridge V0 | EXPLICIT+ASSUMED |
| models | Cursor subscription agents only | ASSUMED |
| base_sha | cf3604613cdbb6a7a279e175f2c792fb25591461 | W0 |
| run_id | 20260905T2304-ruflo-overnight | W0 |
| authorized_by | Founder GO Ruflo Swarm Now! | EXPLICIT |
| authorized_at | 2026-09-05T23:04:08+02:00 | ASSUMED |

## Hard stops
No product implementation; no fake portal APIs/prices; no canonical memory writes; INPUT_DRIFT stops lanes; prefer partial over fake completeness.
