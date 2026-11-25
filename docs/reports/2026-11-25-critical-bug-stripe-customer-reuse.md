# Critical bug — Stripe Checkout minted orphan Customers (2026-11-25)

Head before fix: `origin/main` @ `0437f80d`.

## Bug and impact

Checkout sessions (`createPricingV2CheckoutSession`, seat/top-up, legacy plan) always passed `customer_email` and never `agencies.stripe_customer_id`. Stripe then minted a **new Customer** on every top-up / re-subscribe.

`getCurrentBillingStatus` and `createCustomerPortalSession` resolved the Customer via `customers.list({ email })` (newest first). After a credit top-up the newest row was the orphan — portal and status looked at a Customer **without** the live subscription while `agencies.stripe_customer_id` still pointed at the paying Customer.

**Trigger:** paying agency completes plan checkout (`cus_live`), then buys credits. Portal opens for `cus_orphan`; owner cannot manage the live subscription; billing status can report no subscription for a paying tenant.

## Root cause

Email-only Checkout binding + email-only Customer resolution, ignoring the stored agency Customer id.

## Fix

- `stripeCheckoutCustomerBinding`: reuse `stripe_customer_id` when present, else `customer_email` (never both).
- v2 / seat / top-up / legacy Checkout use the binding.
- Portal + billing status prefer `agencies.stripe_customer_id` (retrieve), fall back to email if missing/deleted.

## Validation

```text
npx vitest run \
  src/lib/__tests__/stripe-checkout-customer.test.ts \
  src/lib/__tests__/billing-store.memo.test.ts \
  src/lib/__tests__/credits-billing-v2.test.ts \
  src/lib/__tests__/billing-store.test.ts \
  src/lib/__tests__/credits-billing.test.ts
→ 5 files / 135 tests PASS
```

## Not in this PR

Tracked open fix PRs (#966 … #881) unchanged. No merge / LIVE.
