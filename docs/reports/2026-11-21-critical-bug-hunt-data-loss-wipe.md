# Critical bug hunt 2026-11-21 — data-loss / wipe / silent truncation

Head at hunt start: `origin/main` @ `0437f80d`.
Fix branch: `cursor/critical-bug-csv-import-agency-scope`.

## Scope

- `apps/crm/src/lib/{matching,recommendations,leads,properties,ai-scoring}-store.ts`
- `apps/crm/src/app/api/agents/` (esp. `cleaner/route.ts`)
- DELETE-then-INSERT / list-all-then-assume-complete / soft-fail-to-empty then wipe
- Import/bulk paths
- Public capture / acquire / valuation delete paths

## Skipped (already tracked, open fix PRs)

| PR | Topic |
|----|--------|
| #952 | recommendations clear-then-insert |
| #948 | multi-agency RLS wipe (matching/recs + listProperties) |
| #944 | type-blind clearRecommendations |
| #930 | match-read soft-fail wipe |
| #924 | LIST_MAX truncation wipe |
| #843 | matching DELETE-then-INSERT timeout wipe |
| #881 | acquire dedup global PK |
| #923 | outreach agency fallback |
| #911 / #902 | gmail ciphertext |

## CRITICAL (NEW)

### 1. CSV `/api/import` email dedup without agency scope → sibling-tenant overwrite

| | |
|--|--|
| **File:line** | `apps/crm/src/app/api/import/route.ts` (pre-fix: email `.in` ~65–68, update ~86–96; inserts used session `agency_id` only on insert path) |
| **Root cause** | Dedup `select id, email … in(email)` relied on RLS `profile_agencies_for_auth()` with **no** `.eq("agency_id", sessionAgency)`. Confirmed-email users can have profiles in ≥2 agencies (same helper as #948). A shared email resolves to a sibling agency lead id; `update … eq(id)` then overwrites that tenant’s name/phone/location/budget/source/note. Universal import already scopes with `.eq("agency_id", job.agencyId)`. |
| **Trigger** | Authenticated user with confirmed email matching profiles in agency A and B; session `profiles.agency_id = A`; UI CSV import (`components/import/csv-import.tsx` → `POST /api/import`) with a row whose email exists on a lead in B. |
| **Impact** | Silent corruption of sibling-tenant CRM lead fields (not a full-table wipe). Session agency may also fail to get a new lead (update path instead of insert). |
| **Fix in this PR** | Refuse missing `agency_id` (403); email lookup + update both `.eq("agency_id", agencyId)`; fail-closed on lookup error; lowercase map keys; chunk `.in` like universal-import. |

## Checked — not new CRITICAL wipe

### `agents/cleaner/route.ts`

- `GET` behind `revolisGuard` (HMAC + `CRON_SECRET`); **not** listed in `apps/crm/vercel.json` crons.
- Uses `createClient()` (cookie/anon session), not service role — cron without cookies → RLS authenticated policy does not authorize mass delete.
- Predicate `.lt('lead_score', 20)` — `public.leads` schema uses **`score`**, not `lead_score` (`lead_score` lives on junk onboarding table in baseline). Call today → PostgREST column error → 500, not wipe.
- Latent landmine if column were renamed and called with a privileged session; not an active wipe trigger on current main.

### Stores (matching / recommendations / leads / properties / ai-scoring)

- Matching empty-read guards present; LIST_MAX / multi-agency / DELETE-INSERT timeout still only via tracked #924 / #948 / #843.
- Recommendations global clear has empty + LIST_MAX + MATCHES_READ_MAX guards; soft-fail match `[]` then clear still #930; type-blind clear #944; clear-then-insert #952.
- `listLeads` SQL-filters `agency_id`; `listProperties` resolves agency then **post-filters** (missing SQL agency still #948).
- `writeScoringRecommendations` type-scoped DELETE-INSERT; scoring recalculate route still drops scoped client → browser singleton on server → latent no-op more than wipe.
- `deleteLead` / `deleteProperty` (store) id-scoped; leads `[id]` DELETE has `sameAgency` gate; properties `[id]` DELETE same. Legacy `DELETE /api/properties` (collection) is id-only + RLS — UI uses `[id]`; not promoted to CRITICAL without a live caller.

### Import / bulk (other)

- Universal import runner: agency-scoped email lookup — OK.
- Portal CSV import: insert-only with required `agency_id` — OK.
- Realvia `/api/realvia/import`: receive-only, no DB wipe — OK.
- Contacts-import-core: transform only, requires agencyId — OK.

### Public capture / acquire / valuation

- Demo public-capture → `leads_demo` insert; no delete of `leads`.
- Acquire email: deletes only own `acquire_dedup_keys` claim on insert failure (#881 still open for global PK class).
- Valuation submit: compensating `leads.delete().eq("id", inserted.id)` only after failed consent insert for that new row — OK.

## Evidence

- Vitest: `apps/crm/src/app/api/import/__tests__/route.agency-scope.test.ts`
- Contrast: `apps/crm/src/lib/universal-import/import-runner.ts` already `.eq("agency_id", job.agencyId)` on email lookup.
