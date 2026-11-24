# Critical bug hunt 2026-11-24 — legacy free grant × leftover seats

Head: `origin/main` @ `0437f80d`. Fix branch: `cursor/fix-legacy-free-grant-seat-cap`.

## Bug and impact

After Stripe cancel / unpaid / incomplete_expired, `syncAgencyBillingLifecycle` sets `agencies.account_tier = "free"` but leaves `seats` at the previous paid quantity. The monthly credit cycle selects every agency with `seats > 0` and `monthlyGrantAmountForAgency` (legacy path) multiplies the freemium solo grant (30 credits/seat) by those leftover seats.

Concrete trigger:
1. Legacy agency (`pricing_model` null) on team/office with e.g. `seats = 10`.
2. Subscription reaches a revoking status → webhook writes `account_tier=free`, `seats` unchanged.
3. Next `runMonthlyCreditCycle` grants `10 × 30 = 300` credits instead of freemium `1 × 30 = 30`.

Impact: ongoing unpaid credit mint (profit leak) for every canceled legacy agency whose seat count was not reset.

## Root cause

Revoke path never clears/caps seats; grant math treated free the same as paid solo × N seats. v2 already gates grants on `subscription_status === "active"`; legacy intentionally ignored status (freemium / invoice) but did not cap free-tier seat multiplier.

## Fix

- `monthlyGrantAmountForAgency`: when `account_tier === "free"`, cap `seatCount` at 1.
- `fetchAgencyCreditsSummary`: same cap so the billing UI matches the cron.

## Validation

```text
npx vitest run src/lib/__tests__/grant-engine.test.ts \
  src/lib/billing/__tests__/fetch-agency-credits-summary.test.ts \
  src/lib/credits/__tests__/monthly-cycle.test.ts
→ 3 files, 33 tests PASS
```

## Not fixed this PR (tracked elsewhere / lower confidence)

Open critical PRs left awaiting review: #965 #962 #963 #961 #960 #953 #952 #951 #948 #946 #945 #944 #942 #934 #933 #930 #924 #923 #911 #902 #843 #859 #881.

Noted previously, not opened here: Checkout `customer_email` without stored `stripe_customer_id` (orphan Customer risk amplifies #953/#945).
