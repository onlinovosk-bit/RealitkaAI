# Critical bug: recommendations recalculate wipe on insert failure

Date: 2026-11-13  
Head reviewed: `origin/main` @ `c0ed01e9`

## Bug

`POST /api/recommendations/recalculate` (global and per-lead) deleted `ai_recommendations` in scope, then inserted the rebuilt set. If the insert failed (DB error, network/timeout), prior rows were already gone and the route returned HTTP 400.

Sibling of matching wipe class tracked in #843 (matching has unique `(lead_id, property_id)` for upsert-first; recommendations have no unique key).

Distinct from open #944 (type-blind clear), #930 (soft-fail match read), #948 (multi-agency RLS scope), #924/#937 (LIST_MAX / match-cap guards already on main).

## Trigger

1. Authenticated broker opens Recommendations and runs recalculate (or `POST /api/recommendations/recalculate` with/without `leadId`).
2. Inventory guards pass (leads under LIST_MAX, matches under MATCHES_READ_MAX).
3. DELETE of existing `ai_recommendations` succeeds.
4. INSERT fails (PostgREST error, client timeout, transient DB fault).
5. Result: empty (or lead-empty) recommendations table + HTTP 400.

## Impact

Permanent loss of AI recommendations visible under RLS for the tenant/lead until a later successful rebuild. User-facing breakage on a normal CRM action.

## Fix

`persistRecalculatedRecommendations` in `recommendations-store.ts`:

1. Generate new rows first.
2. INSERT + `select("id")` first.
3. List scope rows and DELETE only orphan ids (not in the new set).
4. Insert failure → throw before any delete (prior rows kept).
5. Orphan cleanup failure → warn only (new rows kept; stale extras may remain).

## Validation

```bash
cd apps/crm && npx vitest run \
  src/lib/__tests__/recommendations-recalculate-fail-closed.test.ts \
  tests/verification/matching-recommendations-scoped-writes.verification.test.ts
```
