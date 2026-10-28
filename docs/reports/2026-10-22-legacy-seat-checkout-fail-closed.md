# Fix: legacy seat/top-up checkout fail-closed (2026-10-22)

## Bug and impact

Legacy Stripe checkout (`checkoutType=seat` / `credit_topup`) could ACK the webhook while leaving the customer without activation, or activate before money cleared:

1. **0-row UPDATE treated as success** — wrong/missing `agencyId` → PostgREST updates 0 rows, no error → HTTP 200 → payment without seats.
2. **Unpaid `checkout.session.completed` fulfilled** — SEPA/async: entitlements/credits applied while `payment_status=unpaid`; `async_payment_succeeded` was ignored for legacy → unpaid access; failed async never revoked.
3. **Initial grant failure still ACK’d** — seats written, grant RPC fails → Stripe stops retrying → paid customer with 0 grant credits.

v2 plan/credits paths already fail-closed on these axes; legacy did not.

## Root cause

`applySeatCheckoutEntitlements` awaited UPDATE without `.select("id")`. Webhook returned entitlement `ok` regardless of grant result, gated async only for v2, and never checked `payment_status` on legacy branches.

## Fix

- Require at least one updated agency row (same pattern as v2).
- Gate seat/top-up on `payment_status` paid / no_payment_required; ACK unpaid completed without fulfill; fulfill on `async_payment_succeeded`.
- Surface grant hard-failure from `triggerInitialGrantAfterSeatCheckout`; webhook returns false so Stripe retries (entitlement + grant idempotent).

## Validation

```text
npx vitest run src/lib/__tests__/credits-billing.test.ts src/lib/__tests__/credits-billing-v2.test.ts
```

New cases: 0-row entitlement, unpaid ACK, async seat fulfill, grant hard-fail → false.
