# PR 432 profile memo CI fix

**PR:** https://github.com/onlinovosk-bit/RealitkaAI/pull/432
**Branch:** `fix/profile-tier-update-throttle`
**Date:** 2026-08-16
**Mode:** branch + push + STOP. Founder merges.

## Symptom

CI failed deterministically:

- File: `apps/crm/src/lib/profiles/__tests__/auth-profile-request-memo.test.ts`
- Assertion: `expect(supabase.from.mock.calls.length).toBe(afterLink);`
- Expected: `2`
- Received: `4`

## Root cause

`linkProfileToAuthUser` finds with:

`id, agency_id, auth_user_id, email, role, ui_role, account_tier, tier_updated_at`

`widenProfileSelect` / `REQUEST_PROFILE_SELECT` did not treat `tier_updated_at` as canonical, so the link find kept a distinct memo key. Later `resolveProfileForAuthUser` calls widened to the old canonical select and issued two extra `from()` finds.

Throttle behavior (`shouldPersistNormalizedTiers` + skip redundant UPDATE) is unchanged.

## Fix

Added `tier_updated_at` to `REQUEST_PROFILE_SELECT` so link and resolve share one memo key.

Locked the contract in `widenProfileSelect` tests: the link select now widens (contains `full_name`) instead of being left as a non-canonical string.

Did **not** weaken the memo assertion (`from()` count after resolve must still equal `afterLink`).

## Verification

From `apps/crm`:

```text
npx vitest run src/lib/profiles/__tests__/auth-profile-request-memo.test.ts src/lib/profiles/__tests__/profile-tier-throttle.test.ts
Test Files  2 passed (2)
Tests       8 passed (8)

npx vitest run src/lib/profiles/__tests__
Test Files  6 passed (6)
Tests      24 passed (24)
```

## Not done

- No merge.
- `memory/` not written.
- Proxy API-401-on-timeout (#429) not mixed in.
- Production secrets not restored.
- Stage 1 not started.
