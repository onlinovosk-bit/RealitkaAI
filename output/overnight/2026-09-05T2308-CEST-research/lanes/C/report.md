# Lane C — Portal contracts / access

## Decisions
1. **Nehnutelnosti.sk / Reality.sk / Topreality share United Classifieds commercial umbrella** for many agency flows — but **same owner ≠ proven identical API** for every operation; treat each portal publish confirmation as UNKNOWN until vendor docs + credentials.
2. **Public path to publish:** agency activates UC import API with vendor; CRM implements against UC import specification (historically branded Realsoft import docs). Public intro URL fetched tonight returned **404** — credentials/partner docs required.
3. **Revolis repo today is import-heavy (Realvia ingest), not a proven multi-portal exporter.** Pilot scope must cut portal export if vendor access missing → PASS_WITH_CONDITIONS for research; BLOCKED for adapter build.

## Integration matrix (public knowledge only)

| Portal | Publish method (public) | Auth | Create | Update | Deactivate/Delete | Stable external ID | Images | Limits/errors | Publish confirm |
|---|---|---|---|---|---|---|---|---|---|
| Nehnutelnosti.sk | UC import API (vendor+integrator claims); also via backOFFICE bridge | UNKNOWN (partner) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN (migrators report empty IDs risk) | UNKNOWN (media URL domain changes reported) | UNKNOWN | UNKNOWN |
| Reality.sk | Same UC family per backOFFICE export page | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Topreality.sk | Same UC family per backOFFICE export page | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

### Import into CRM (separate)
- Realvia JSON/webhook paths exist in repo (CODE_PRESENT) — not a substitute for UC export contract.

### Alternative rails
- ZRKS open API (agency-owned listing DB) documented at zrks.sk — different commercial/governance model
- Third-party distributors (e.g. RealSys marketing) — not primary contract

## Evidence
- https://www.backoffice.sk/realitny-software/exporty/ accessed 2026-09-05 — UC API activation required for nehnutelnosti/reality/topreality
- DocPlayer Podmienky inzercie Nehnutelnosti.sk — contact sales for software import; lists Living/Areality/Lojzo/backoffice as paths
- https://plt.unitedclassifieds.sk/import/docs/v1/realsoft/docs/intro → **404** on 2026-09-05 fetch
- Nakoduj.to project cites UC realsoft docs URLs (secondary)
- Repo: apps/crm/src/lib/realvia, api/webhooks/realvia, api/integrations/portal

## Assumptions
- Paying UC listing package ≠ automatic API credentials
- Export adapter must not reuse scrape parsers as contract

## Unknowns
- Current UC OpenAPI/XSD (blocked without partner access)
- Per-portal field diffs inside UC
- Rate limits, idempotency, delete semantics
- Test sandbox availability

## Experiments
- Founder requests UC partner import docs + sandbox for one agency; gate: docs received within 10 business days else portal export stays backlog.

## Product Implications
- Pilot week 1–2: CRM core + Realvia import honesty; portal export only if docs in hand
- Do not invent endpoints in implementation PRs

## Decision Memory Payload (DRAFT)
- 2026-09-05: Portal export BLOCKED pending UC partner docs; public 404 on legacy realsoft intro URL.