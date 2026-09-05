# 2026-09-05 — PR #535 babysit (Code Contract Guard)

## Verdict

In-scope fix applied on `notification-digest`. **Remaining red:** Code Contract Guard still fails on `apps/crm/src/app/api/onboarding/session/route.ts` inherited from `main` / merged PR #534 — **out of this PR’s changedFiles**.

## Unresolved review comments

None (no unresolved review threads on PR #535).

## CI at start

- `Zmluva kódu (ratchet)` **FAILURE** — 4 new violations
- `Lint, test, build` in progress
- Branch already contained latest `main` (incl. #534 merge); behind-count `0`

## Fixed in this PR (in scope)

`apps/crm/src/app/api/cron/notification-digest/route.ts`:

- `@/lib/api-response` → `okResponse` / `errorResponse` (aligned with `customer-health` / `credits-cycle`)
- `@/lib/usage-metrics` → `incrementUsageMetric` + `SYSTEM_USAGE_AGENCY_ID` metric `cron_notification_digest`
- try/catch → 500 via `errorResponse`
- unit test mocks `usage-metrics`

Local proof:

- `node apps/crm/scripts/check-api-contract.mjs --ci` → notification-digest **gone** from NOVÉ
- `npx vitest run` notification-digest route + verification → **7 passed**

## Remaining blocker (not this PR)

After in-scope fix, ratchet still reports **2 NOVÉ**:

1. `onboarding/session/route.ts` — missing `@/lib/usage-metrics`
2. `onboarding/session/route.ts` — missing `@/lib/api-validate`

Same file landed via #534 (`security(rls): close onboarding_sessions anon ALL via session API`). PR #534 itself had **failing** Code Contract Guard and was still merged. This branch did not introduce that route.

**Do not** expand #535 into onboarding session API (1 PR = 1 logical change). Unblock options for founder:

- follow-up PR on `main` adding validate + usage-metrics to onboarding session, **or**
- accept that ratchet stays red until that follow-up (if branch protection does not require this check — #534 precedent)

## Merge-ready status

- This PR’s own contract debt: **cleared**
- Full green CI: **blocked by inherited onboarding contract violations from main/#534**
- Agent must **not** merge; founder decision on onboarding follow-up vs merge with known ratchet red
