# Legacy checkout async fail-closed (2026-10-25)

## Bug and impact

1. **Silent ACK on failed async seat / top-up / starter_pack fulfill**  
   `POST /api/billing/webhook` only treated `async_payment_succeeded` as a pricing checkout for v2 types. After #916, legacy seat/top-up *do* fulfill on async — but a `false` return still produced HTTP 200. Stripe stops retrying → customer paid, seats/credits never applied.

2. **Starter pack fulfilled before money cleared**  
   `checkoutType=starter_pack` on `completed` ignored `payment_status` and created redemption code + download email while still `unpaid`. Async path returned `false` and was also unguarded at the route.

## Trigger

- Buyer pays with SEPA (or other async method) for legacy seat, credit top-up, or starter pack.
- `completed` + `unpaid` arrives first (seat/top-up correctly wait; starter pack previously fulfilled).
- Later `async_payment_succeeded` runs fulfill; DB/RPC blip → handler `false` → previously HTTP 200 forever.

## Root cause

`isPricingCheckoutSession` gated async only for `pricing_v2` / `pricing_v2_credits`. Starter pack skipped `isSessionPaid`.

## Fix

- Gate all pricing checkout types on both `completed` and `async_payment_succeeded`.
- Starter pack: unpaid → ACK without fulfill; paid / async → idempotent fulfill; fail → `false` → 500.

## Validation

- `npx vitest run` on webhook route + credits-billing tests (see commit CI / local run).
