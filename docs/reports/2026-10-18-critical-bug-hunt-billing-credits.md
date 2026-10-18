# Critical bug hunt — billing / credits (2026-10-18)

Head: `626748f0`. Branch: `cursor/critical-bug-scan-f19c`.

Scope: `credits/checkout`, `saas-ops` / billing-store trial gates (#854), grant-engine / checkout+cron grant paths, Price ID fail-open/closed (#867).

## Already tracked (not re-reported)

- #843 matching-store recalculate wipe
- #845 applyPricingV2SubscriptionEvent stale Stripe
- #859 grant-engine expire absolute balance write
- #877 agencyPaysOutsideStripe omits `past_due`
- #881 acquire_dedup_keys global PK

## CRITICAL findings (new)

### 1. Seat checkout webhook ACKs payment even when initial credit grant fails

**Where:** `apps/crm/src/lib/credits-billing-webhook.ts` (seat branch)

```ts
if (ok) {
  await triggerInitialGrantAfterSeatCheckout(agencyId);
}
return ok;
```

**Trigger:** Customer completes seat Checkout → `checkout.session.completed` → `applySeatCheckoutEntitlements` succeeds → `grantMonthlyCreditsForAgency` / RPC fails or returns skipped (service-role blip, RPC error, amount path failure).

**Impact:** Webhook returns `true` → route ACKs Stripe → **no retries**. Agency gets seats/`subscription_status: active` but **0 initial grant credits** until the next monthly cron (up to ~1 month). Contrasts with v2 plan fulfillment, which returns `false` on grant failure so Stripe retries.

### 2. Legacy seat / credit_topup fulfill without `payment_status` check (v2 was fixed; legacy was not)

**Where:** `apps/crm/src/lib/credits-billing-webhook.ts` seat + `credit_topup` branches vs `fulfillPricingV2PlanCheckout` / `fulfillPricingV2CreditsCheckout` (`isSessionPaid`).

**Trigger:** `checkout.session.completed` with `payment_status: "unpaid"` (async method / delayed capture). Legacy path still runs entitlements / `applyTopupPurchase`. Separately, `async_payment_succeeded` for seat/topup is explicitly ignored (`return false` after v2 handlers) — pinned in tests as “legacy behaviour unchanged”.

**Impact:**

- Unpaid `completed` → seats hardcoded `subscription_status: "active"` and/or purchased credits credited **before money clears**.
- If payment later fails → paid entitlements remain.
- If only `async_payment_succeeded` arrives for seat/topup → fulfillment never succeeds (500 retries or stuck unpaid entitlement depending on whether `completed` already ran).

### 3. `#854` agency-facts DB error fail-closes invoice payers (asymmetric vs Stripe `lookupFailed`)

**Where:** `apps/crm/src/lib/saas-ops.ts` — `loadAgencyBillingFacts` → `NO_AGENCY_FACTS` (`paysOutsideStripe: false`) on select error / catch; `trialGraceFrom` only consults `paysOutsideStripe` when `!hasSubscription`.

**Trigger:** Invoice-paying agency (no Stripe customer/subscription — Prod 2026-10-15: 7/7) hits a transient Supabase error on the agencies billing-facts select, while Stripe lookup succeeds as “no customer”.

**Impact:** `paysOutsideStripe` collapses to false → after trial window `state: "limited"` (read-only) despite a paying `manual_plan` / non-free plan in DB. Stripe outages fail-open to `unknown`/full access; agency-facts outages fail-closed — undoes Bod 10 for the exact cohort the fix targeted whenever the agencies read blips.

## Cleared in scope

- **#867 Price IDs:** checkout route fail-closed (503 + `missingPriceEnvKeys` for legacy seat/topup and v2). No silent Stripe call with missing/placeholder prices found on the guarded paths.
- **`e8a69aca`:** tests only (grant mapping / OpenAI / email mask) — no production logic change.
- **`73ef8e68`:** privacy minimize — out of billing scope as stated.

## Next (GO gate)

Fix finding 1 first (return `false` unless grant ok or already idempotently granted) in one PR; then align legacy seat/topup with `isSessionPaid` + async fulfillment (finding 2); then fail-open or fail-unknown on agency-facts load errors for invoice cohort (finding 3). Explicit GO before implement/merge.
