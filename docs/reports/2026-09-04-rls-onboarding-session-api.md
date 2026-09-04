# Report: close onboarding_sessions anon ALL via session API

**Date:** 2026-09-04  
**Branch:** `security/rls-onboarding-session`  
**Mode:** Path B (API + DROP anon ALL)  
**Production:** migration **PREPARED, NOT applied** (no `apply_migration` / db push from agent)

## Goal

Remove the last open `anon` policy (`Allow anon access` on `public.onboarding_sessions`)
without breaking public onboarding progress sync.

## Implemented

1. **API** `GET|POST /api/onboarding/session`
   - service role via `createServiceRoleClient()`
   - UUID `session_id` validation
   - IP rate-limit (30/min)
   - get-by-id / upsert-by-id only — no list-all
2. **Clients** call API helpers (`@/lib/onboarding/session-api`):
   - `useOnboarding.ts`
   - `OnboardingClient.tsx`
   - `TestDbClient.tsx` (same table access pattern)
   - localStorage remains SoT; sync soft-fails
3. **Migration (not applied):**
   `apps/crm/supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql`
   - `DROP POLICY IF EXISTS "Allow anon access"` with `to_regclass` guard
   - after drop: RLS on + 0 policies = deny for anon/authenticated; service role bypasses
4. **Rollback runbook:** `docs/runbooks/rollback-onboarding-sessions-anon.md`
5. **Tests:**
   - unit: `apps/crm/src/app/api/onboarding/session/__tests__/route.test.ts`
   - verification: `apps/crm/tests/verification/onboarding-sessions-api.verification.test.ts`

## Explicitly NOT done here

- **Migration not applied to production**
- **PR not merged**
- `lead_assignment_rules` / Brief 17 `agency_id` drift — related finding only
- `integration_settings` full deny — intentional, untouched

## Founder apply order (after Preview OK + merge GO)

1. Confirm Preview: onboarding wizard advances; Network shows `/api/onboarding/session` (not direct PostgREST `onboarding_sessions`).
2. Merge PR when CI green.
3. Apply migration SQL in prod SQL editor (or approved migrate path).
4. Re-check: anon cannot `SELECT *` / list all; own sync via API still works.
5. Keep rollback runbook ready for 24h.

## Evidence checklist

- [x] Client no longer depends on open anon ALL for sync
- [x] Migration prepared in repo
- [x] Rollback runbook exists
- [x] Report in `docs/reports/`
- [ ] Founder applies migration after GO
- [x] PR open: https://github.com/onlinovosk-bit/RealitkaAI/pull/534

## Verification run (local)

```text
npx vitest run src/app/api/onboarding/session/__tests__/route.test.ts \
  tests/verification/onboarding-sessions-api.verification.test.ts

Test Files  2 passed (2)
Tests       11 passed (11)
```

Migration **not** applied. Build full 
ext build skipped (focused vitest only; Preview CI covers build).