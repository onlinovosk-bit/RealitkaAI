# Critical bug fix — matching recalculate data loss (2026-08-19)

## Bug and impact

Authenticated `POST /api/matching/recalculate` (global, no `leadId`/`propertyId`) **deleted all tenant `lead_property_matches` and re-inserted zero rows**, returning HTTP 200. Same class as forecasting/properties scoped-client bugs (#434 / #443).

Secondary: after a successful DELETE, insert timeouts were swallowed as `{ inserted: 0 }` → silent wipe on lead/property recalculate (amplified by #428 8s fetch timeout).

## Root cause

1. `recalculateAllMatches(scoped)` used scoped client for DELETE, but called `listLeads()` / `listProperties()` **without** `scoped` → `resolveTenantSupabase()` falls back to browser singleton without cookies → empty lists → no re-insert.
2. `recalculateMatchesForProperty` same unscoped `getProperty` / `listLeads`.
3. `isRecoverableMatchingError` catch after DELETE returned success instead of failing hard.
4. `autoRecalculateForLead` / `autoRecalculateForProperty` from lead/property API routes never received the request-scoped client.

## Fix

- Pass `scoped` into all list/get reads in recalculate paths.
- Compute payload before DELETE; never swallow post-delete write failures.
- Thread scoped client through matching hooks + lead/property mutation callers.

## Validation

- Unit: `src/lib/__tests__/matching-store-recalculate.test.ts` (scoped call args + insert failure throws).
- Verification: `tests/verification/matching-recommendations-scoped-writes.verification.test.ts` extended.

## Residual risk

- No DB transaction around delete+insert — a mid-flight crash can still leave empty matches, but the API now fails instead of lying with 200.
- Agencies with >500 leads/properties still hit list caps (pre-existing pagination).
