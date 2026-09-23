# Lane D — Architecture + data model evolution

## Decisions
1. **Keep Next.js App Router + Supabase (Postgres+RLS+Auth)** as system of record — NestJS greenfield fails cost/timing vs existing CRM.
2. **Queue:** prefer existing cron/job patterns + Postgres outbox if needed; BullMQ+Redis only if proven backlog (PROD_UNKNOWN pressure).
3. **FE:** reuse existing components; do not mandate shadcn/TanStack rewrite for pilot.
4. **Maps:** keep MapLibre already in package.json; Mapbox only if tile/product gap proven.
5. **Model evolution (minimal):** reinforce tenant membership/roles, Property typed core+specs, Contact≠Deal, Viewing via scheduled_events, media, portal_publication_jobs (new table only when export unblocked), phone access audit invariant.

## Alternatives considered
| Option | Pros | Cons |
|---|---|---|
| Stay Next/Supabase | reuse, RLS, shipping speed | cron limits, coupling |
| NestJS + separate API | clearer jobs | rewrite cost, dual auth |
| Other BaaS | — | migration risk, no customer pull |

## Security invariants (testable)
- Composite tenant FK + RLS WITH CHECK on tenant tables
- Server-side agency context on mutations
- Phone value only via audited path; audit failure → no value return
- Storage objects agency-scoped
- Portal jobs: idempotent keys, no silent older-update overwrite, accepted≠published states

## Phase-2 interfaces only
- Transcription, kataster live owners, outreach bots — interfaces/backlog, not build

## Evidence
- Lane A reuse matrix; package.json; migrations RLS hardening Sep 2026
- Lane C: export adapter blocked → design portal_publication_jobs but do not implement without docs

## Assumptions
- Single paying reference agency patterns generalize cautiously

## Unknowns
- Prod queue depth / missed cron SLOs
- Phone audit completeness

## Experiments
- Load RLS isolation suite on preview after schema freeze

## Product Implications
- Spec-only tonight; implementation backlog in G must respect portal cut

## Decision Memory Payload (DRAFT)
- 2026-09-05: Architecture = evolve Revolis CRM; no Nest rewrite; portal jobs behind vendor gate.