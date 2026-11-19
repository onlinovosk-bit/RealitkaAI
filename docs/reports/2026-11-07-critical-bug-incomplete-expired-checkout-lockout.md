# Critical bug — incomplete_expired checkout lockout (2026-11-07)

## Bug and impact

A v2 (or legacy) agency stuck with `subscription_status = incomplete_expired` and a leftover `stripe_subscription_id` could not start a fresh Pricing v2 Checkout. UI path returned `subscription_exists` / `legacy_subscription` while the tenant was already on free tier → permanent paid-plan lockout until manual DB repair.

## Concrete trigger

1. Customer abandons Checkout; Stripe moves the subscription to `incomplete_expired`.
2. `syncAgencyBillingLifecycle` writes raw `subscription_status = incomplete_expired` and downgrades `account_tier` to free (keeps `stripe_subscription_id`).
3. `applyPricingV2SubscriptionEvent` / `revokePricingV2Agency` fails or is retried (Stripe API / DB) and never rewrites status to `canceled`.
4. User retries Upgrade → `hasLiveSubscription` treated leftover as live via `stripe_subscription_id && status !== "canceled"`.

## Root cause

`hasLiveSubscription` in `credits-billing-v2.ts` only exempted `canceled` in its second clause. `incomplete_expired` is equally terminal in Stripe but was still treated as live.

## Fix

Treat `incomplete_expired` as terminal alongside `canceled` before the live-status / leftover-id checks.

## Validation

```bash
cd apps/crm && npx vitest run src/lib/__tests__/credits-billing-v2.test.ts
```

**83/83 passed.**
