# Critical fix — auth-email-tests cross-tenant recovery + invite agency_id

**Date:** 2026-08-23  
**Branch:** `cursor/critical-bug-management-5d7b`  
**Hunt report:** `docs/reports/2026-08-23-critical-bug-hunt.md`

## Bug and impact

`POST /api/settings/auth-email-tests` with `action: "recovery-link"` (and `recovery`) allowed any agency **owner** to target an email in **another** tenant. For `recovery-link`, the JSON body returned Supabase Admin `action_link` → attacker sets victim password → **cross-tenant account takeover**.

Sibling: `action: "invite"` upserted `profiles` without `agency_id` (same class as open PR #447 on `/api/invite`).

## Root cause

Owner gate checked role only (`canManageUsers`). Target email was never constrained to caller `agency_id`. Admin `generateLink` returned the recovery URL to the browser.

## Fix

- Before cross-user `recovery` / `recovery-link`: look up target profile (safe email match) and require `target.agency_id === caller.agency_id`.
- Invite: require caller `agency_id`; stamp `agency_id` + `auth_user_id` on upsert.

## Validation

```text
npx vitest run src/app/api/settings/auth-email-tests/__tests__/route.test.ts \
  tests/verification/auth-email-tests-tenant.verification.test.ts
```

## Trigger scenario (pre-fix)

1. Owner A opens Settings → Auth e-mail testy.
2. Sets email to victim in Agency B; clicks „Vytvoriť odkaz na reset hesla“.
3. Receives `recoveryLink` → opens → sets password → takes over B’s account.
