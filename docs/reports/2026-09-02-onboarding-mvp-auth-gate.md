# P0 — Onboarding MVP auth gate

**Date:** 2026-09-02  
**Branch:** `fix/onboarding-mvp-auth-gate`  
**Mode:** branch + PR + STOP (no merge)

## Nález

`/api/onboarding/mvp/*` bypassoval session gate v `proxy.ts`. Handlers používali service-role bez auth — PII leak + unauthenticated email dispatch.

## Zmeny

1. Removed `ONBOARDING_MVP_PREFIX` bypass from `proxy.ts` (no other proxy paths touched).
2. `at-risk`, `checklist`, `messages/schedule` → `requirePlatformAdmin()` before `createServiceRoleClient()` (same `isPlatformAdmin` / `profiles.is_platform_admin` pattern as operator).
3. Deleted `messages/dispatch` — covered by `/api/cron/onboarding-dispatch` (Bearer `CRON_SECRET`). Removed browser "Spustiť dispatch" from CSM page (project rule: no unattended email send from UI).
4. `/onboarding-monitor` keeps `credentials: "include"`; 403 shows platform-admin message (not empty-data state).
5. Verification + unit tests for gate behavior.

## Follow-up (2026-09-02) — profile lookup fix

Initial gate used `.eq("id", user.id)` — fails on PROD where `profiles.id` ≠ `auth.uid()`.
Shared helper `fetchProfilePlatformAdminFlag` now uses `.or(auth_user_id.eq.{uid},id.eq.{uid})`
(same as `/trh`). Same fix in `canAccessOperatorDashboard` → unblocks `/operator` after column + grant.

## Dispatch decision

**Deleted.** `api/cron/onboarding-dispatch/route.ts` already calls `runOnboardingDispatch()` behind cron secret. Keeping a second unauthenticated/browser path violated the "drafts áno, send nikdy" rule.
