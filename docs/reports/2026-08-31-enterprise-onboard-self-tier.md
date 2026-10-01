# Critical bug: Enterprise onboard self-assigns `account_tier`

**Date:** 2026-08-31  
**Severity:** CRITICAL (billing / entitlement bypass → owner_vision UI)  
**Status:** Fixed on branch (PR pending)

## Bug and impact

Any authenticated user could call `POST /api/enterprise/onboard-start` and receive `profiles.account_tier = 'enterprise'` with no Stripe payment and no role check.

`normalizeProfileEntitlements` then promotes `ui_role` from `agent` → `owner_vision` when `account_tier` is `enterprise` / `market_vision`, and `linkProfileToAuthUser` can persist that promotion.

**Trigger:** logged-in free/agent user → `POST /api/enterprise/onboard-start` → tier written → next session resolves as owner_vision.

Same class as profiles self-escalation (#493 for `role`/`agency_id`), but for **paid entitlement fields** that #493 does not freeze.

Secondary landmine: `"use server"` export `upgradeToL99(authUserId, balik)` used service_role to set `account_tier` with **no auth check** (callable server action surface even with no UI callers).

## Root cause

1. White-glove onboard route treated as self-serve and wrote `account_tier: "enterprise"` via the caller's scoped Supabase client under `profiles_self_update` (full-row UPDATE).
2. No DB guard on `account_tier` / `ui_role` (only role/agency_id covered by open #493).
3. Dead `upgradeToL99` server action could escalate via service_role without session.

## Fix

1. **`onboard-start`:** auth required; allow shadow-inventory only when profile already has enterprise/market_vision/protocol_authority; **never** write `account_tier` / `ui_role`.
2. **Migration `20260831233000_profiles_guard_account_tier_ui_role.sql`:** BEFORE UPDATE trigger soft-reverts `account_tier`/`ui_role` unless JWT role is `service_role`.
3. **`upgradeToL99`:** disabled — throws; billing-only entitlements.

## Validation

```bash
cd apps/crm && npx vitest run \
  src/app/api/enterprise/onboard-start/__tests__/route.test.ts \
  tests/verification/enterprise-onboard-no-self-tier.verification.test.ts
```

## Related open PRs (not duplicates)

- #493 — role/agency_id self-escalation (does not cover account_tier/ui_role)
- #481 — empty agencyId Stripe checkout
