# Critical bug: pricing v2 subscription webhook trusted stale Stripe event payload

**Date:** 2026-10-13  
**Branch:** `cursor/critical-bug-pricing-v2-stale-webhook`  
**Severity:** high (billing entitlements / monthly credit grants)

## Bug and impact

`applyPricingV2SubscriptionEvent` wrote `agencies.subscription_status`, band, seats and `account_tier` from `event.data.object` instead of a live Stripe `subscriptions.retrieve`.

The same webhook route already runs `syncAgencyBillingLifecycle`, which retrieves live state specifically because Stripe events can arrive out of order or be retried. The v2 handler then overwrote that correct write with the stale event payload.

Concrete triggers:

1. **Lost grants:** Agency recovers from `past_due` → `active`. A delayed/retried `customer.subscription.updated` with `past_due` is processed last → DB stuck on `past_due` → `monthlyGrantAmountForAgency` returns 0 for v2 (`subscription_status !== 'active'`).
2. **Unauthorized reactivation:** Agency cancels. A stale `subscription.updated` with `status: active` and v2 price items is processed after cancel → paid `account_tier` / seats / pack re-applied while subscription is canceled.

## Root cause

Dual writers on one webhook:

1. `syncAgencyBillingLifecycle` — live retrieve (correct).
2. `applyPricingV2SubscriptionEvent` — trusted event object (incorrect for ordering).

Checkout fulfillment already documented the live-retrieve rule; subscription lifecycle for v2 did not follow it.

## Fix

- `applyPricingV2SubscriptionEvent` loads live subscription via Stripe retrieve before writing.
- Live status in `{canceled, unpaid, incomplete_expired}` (or `resource_missing`) goes through the same revoke path as `customer.subscription.deleted` (free + pack cleared + profile downgrade).
- `customer.subscription.deleted` still revokes from event type (authoritative cancel signal).
- Retrieve / missing live status failures return `false` so Stripe retries.

## Validation

- Unit tests in `credits-billing-v2.test.ts`: stale `past_due` cannot overwrite live `active`; stale `active` cannot reactivate live `canceled`; revoked live statuses free the agency; retrieve failure → false.
- `npx vitest run src/lib/__tests__/credits-billing-v2.test.ts` (and related lifecycle tests).

## Related (not fixed here)

- Matching recalculate wipe window — still open: https://github.com/onlinovosk-bit/RealitkaAI/pull/843
