# Properties scoped Supabase client (inventory CRUD)

**Date:** 2026-08-18  
**Lane:** critical-bug automation  
**Branch:** `cursor/critical-bug-management-d0db`

## Bug and impact

`/api/properties/[id]` PATCH/DELETE and `/api/properties` POST created a request-scoped Supabase client for auth, then called `getProperty` / `updateProperty` / `deleteProperty` / `createProperty` **without** passing it.

Those store helpers call `resolveTenantSupabase()` with no argument → browser singleton (`createBrowserClient`) with **no request cookies** on the server.

**Trigger:** Authenticated broker edits/deletes a property in `property-edit-slide-over`, or creates one via `property-create-form`.

**Impact:** Inventory mutations fail under RLS (empty/error). Same failure class as forecasting before #434. Create UI also expected `okResponse` (`data.ok`); POST previously returned a bare property object, so the form treated success as failure even if a write somehow succeeded.

## Root cause

Missed follow-through after the #434 pattern: server routes must thread `await createClient()` into store functions. `GET /api/properties` already did; mutation paths did not.

## Fix

- `createProperty` / `updateProperty` / `deleteProperty` accept optional scoped client.
- `[id]/route.ts` and `POST /api/properties` pass `supabase`.
- POST returns `okResponse({ property })` to match the create form contract.
- `getLeadById` accepts scoped client; matching action passes it with `getProperty`.

## Validation

```text
npx vitest run src/lib/__tests__/properties-scoped-client.test.ts \
  tests/verification/properties-scoped-client.verification.test.ts
Test Files  2 passed (2)
Tests       6 passed (6)
```

## Out of scope

Does not replace open fixes #369/#370/#371/#374/#392/#401/#427/#438/#439.
