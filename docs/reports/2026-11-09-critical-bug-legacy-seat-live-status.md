# Critical bug fix — legacy seat checkout live Stripe status (2026-11-09)

## Bug and impact

`applySeatCheckoutEntitlements` hard-coded `subscription_status: "active"` from Checkout session metadata with no `subscriptions.retrieve`. A redelivered `checkout.session.completed` / `async_payment_succeeded` after cancel/`unpaid`/`incomplete_expired` restored paid agency tier, seats, and profile entitlements without a live subscription.

## Root cause

Pricing v2 gained `loadLiveSubscriptionStatus` + revoked-status refuse; the legacy seat webhook path never received the same gate.

## Fix

- Retrieve live subscription status before writing entitlements.
- Revoked live status → ACK without write or grant.
- Non-active live status (e.g. `past_due`) → write real status; skip initial grant (legacy grant math ignores `subscription_status`).
- Missing subscription id / retrieve failure → fail-closed (`ok: false`) so Stripe retries.

## Validation

`npx vitest run src/lib/__tests__/credits-billing.test.ts` — 30 passed (includes revoked replay + past_due grant skip).
