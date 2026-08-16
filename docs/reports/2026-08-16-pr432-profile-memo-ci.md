# PR 432 — profile memo CI fix

**Date:** 2026-08-16
**PR:** https://github.com/onlinovosk-bit/RealitkaAI/pull/432
**Branch:** `fix/profile-tier-update-throttle`
**Verdict:** FAIL root cause confirmed; fix landed on the PR branch. **STOP — no merge.**

## Symptom

CI `auth-profile-request-memo.test.ts` line 69:

```text
expect(supabase.from.mock.calls.length).toBe(afterLink);
expected 2, received 4
```

`linkProfileToAuthUser` + two later `resolveProfileForAuthUser` calls with different selects must share one find. They did not.

## Root cause (inspected on the PR branch)

`linkProfileToAuthUserUncached` finds with:

```text
id, agency_id, auth_user_id, email, role, ui_role, account_tier, tier_updated_at
```

`REQUEST_PROFILE_SELECT` / `widenProfileSelect` did **not** treat `tier_updated_at` as canonical:

```text
id, agency_id, auth_user_id, email, role, ui_role, account_tier, full_name
```

`widenProfileSelect` only rewrites to the canonical string when every requested column is in that set. `tier_updated_at` was extra, so the link find kept its own select string. `resolveProfileForAuthUser` widened subsets (`agency_id`, then the longer entitlement select) to the canonical string. Memo key is `find:${userId}:${email}:${resolvedSelect}` — two keys, two finds. `from()` went 2 → 4.

Throttle behavior (`shouldPersistNormalizedTiers` + skip redundant UPDATE) is independent and stays in place.

## Fix (1 logical change)

Add `tier_updated_at` to `REQUEST_PROFILE_SELECT` so the link select is a subset of canonical and `widenProfileSelect` returns one memo key for link + resolve.

Lock in `auth-profile-request-memo.test.ts`:

- subset `agency_id` widens to include `tier_updated_at`
- the exact link select widens to include `full_name` (canonical rewrite)

Did **not** weaken `expect(from.mock.calls.length).toBe(afterLink)`. Extra finds were a bug, not intended.

## Test evidence

From `apps/crm`:

```text
npx vitest run src/lib/profiles/__tests__/auth-profile-request-memo.test.ts src/lib/profiles/__tests__/profile-tier-throttle.test.ts
Test Files  2 passed (2)
Tests       8 passed (8)

npx vitest run src/lib/profiles/__tests__/link-profile-to-auth.test.ts src/lib/profiles/__tests__/resolve-profile-for-auth.test.ts src/lib/profiles/__tests__/resolve-profile-service-fallback.test.ts
Test Files  3 passed (3)
Tests       13 passed (13)
```

## Out of scope (not done)

- No merge.
- No proxy API-401-on-timeout (#429 follow-up).
- No `memory/` writes.
- No Production secrets restore.
- No Stage 1.

## STOP

Founder merges after green CI on PR 432.
