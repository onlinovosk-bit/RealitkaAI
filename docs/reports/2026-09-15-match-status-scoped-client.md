# Match status PATCH — scoped client fix (2026-09-15)

## Bug

`PATCH /api/leads/[id]/matches/[matchId]` authenticated with `createClient()`, then called
`updateLeadPropertyMatchStatus(id, matchId, status)` which had **no scoped parameter** and
always resolved to the cookie-less browser singleton via `resolveTenantSupabase()`.

After `matches_anon_legacy_all` was dropped (migration `20260904150000`, prod 2026-09-04),
anon cannot SELECT/UPDATE `lead_property_matches`. Match status changes (Záujem /
Odmietnuté / Prezreté) throw and never persist.

Secondary: `addLeadActivity` also omitted scoped → activity audit drop on the same path.
Tenant gate was fail-open when `callerProfile.agency_id` was null.

## Trigger

Agent opens a lead → matching offers → sets status to interested/rejected/viewed.

## Impact

Core matching pipeline decisions do not stick; agent thinks status changed (or gets 400)
while DB remains `sent`. Distinct from open #444 (recalculate wipe).

## Fix

- `updateLeadPropertyMatchStatus(..., scoped?)` forwards scoped client + `getProperty(..., scoped)`
- Route threads `createClient()` into status update and `addLeadActivity`
- Fail-closed Forbidden when caller/lead agency is missing or mismatched

## Validation

- Unit: `src/lib/__tests__/match-status-scoped-client.test.ts`
- Verification: `tests/verification/match-status-scoped-client.verification.test.ts`
- Extended: `matching-recommendations-scoped-writes.verification.test.ts`

## Out of scope (noted, not fixed here)

- `POST /api/team/users` — no authenticated INSERT policy on `profiles` after
  `20260508220000` (use invite path; separate PR)
- `/management` SSR empty lists without scoped RSC client (separate PR)
