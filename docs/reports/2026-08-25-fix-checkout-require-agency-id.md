# Fix: refuse seat/top-up Stripe checkout without agency_id

**Date:** 2026-08-25  
**Severity:** CRITICAL (paid session, no fulfillment)  
**Branch:** `cursor/fix-checkout-require-agency-id`

## Bug and impact

`createSeatCheckoutSession` / `createTopupCheckoutSession` wrote
`metadata.agencyId = profile.agency_id ?? ""`. When the caller profile has
`agency_id = null` (e.g. invitee stamped without tenant — open #447), Stripe
Checkout still opens and the customer can pay.

After payment, `handlePricingCheckoutWebhook` returns `false` on empty
`agencyId`, and `/api/billing/webhook` responds **500** (fail-closed after
#401). Seats/credits are never applied; Stripe retries forever.

## Root cause

Checkout creation did not require a non-empty agency UUID before creating the
Stripe session. Empty string is falsy in the webhook guard, so fulfillment is
permanently impossible for that session.

## Trigger scenario

1. Authenticated user with `profiles.agency_id = null` opens upgrade/billing.
2. Starts seat or credit top-up checkout → Stripe session created with
   `agencyId: ""`.
3. Customer pays successfully.
4. Webhook cannot fulfill → 500; entitlement never applied.

## Fix

- Add `requireCheckoutAgencyId()` — throws before `stripe.checkout.sessions.create`
  when agency id is missing/blank.
- Seat and top-up paths both use the resolved agency id in metadata.
- Checkout route already maps thrown errors to HTTP 400.

## Validation

```text
npx vitest run src/lib/__tests__/credits-billing.test.ts
# 12 passed (incl. requireCheckoutAgencyId + empty-agencyId webhook false)
```

## Out of scope (separate PRs / already tracked)

- HubSpot / AI analyze null-agency IDOR (docs #480)
- Cron `Bearer undefined` fail-open (docs #480)
- Open #447 invite `agency_id` stamp (root cause of null profiles)
