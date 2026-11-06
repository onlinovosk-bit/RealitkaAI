# Critical bug: pricing-v2 subscription.updated wipes pack_credits on unrecognized price

**Date:** 2026-10-30  
**Head before fix:** `origin/main` @ `28bbef72`  
**Severity:** High — silent under-grant of paid monthly credits

## Bug and impact

`applyPricingV2SubscriptionEvent` on `customer.subscription.updated` always wrote
`agencies.pack_credits` from `readPricingV2SubscriptionItems`. That helper defaults
`packCredits` to `0` when no configured pack Price ID matches.

If the seat Price ID still resolves but the pack (or any addon) Price ID does not
(env rotated, Preview/Prod mismatch, pack price recreated in Stripe), the handler
kept the seat/band update and set **`pack_credits: 0`**.

Monthly grant is `band + pack_credits` (`monthlyGrantAmountForAgency`). Example:
office (120) + pack 100 → **220** becomes **120** after the next subscription
sync, with HTTP success / Stripe ACK — no retry.

## Concrete trigger

1. Agency on pricing v2/v3: `subscription_status=active`, `pack_credits=100`, seat quantity 10.
2. Stripe subscription still has seat + pack line items; pack Price ID is `price_new`.
3. Env still has (or only has) the old pack Price ID, while `STRIPE_PRICE_V3_SEAT_*` matches.
4. Any `customer.subscription.updated` (quantity, payment method, invoice cycle) → retrieve → seat resolves, pack does not → DB `pack_credits=0`.
5. Next monthly grant under-credits by the pack amount.

## Root cause

Fail-open default: unrecognized line item ≡ “no pack”, then unconditional
`update.pack_credits = packCredits`.

## Fix

- `readPricingV2SubscriptionItems` returns `pricesFullyResolved`.
- Write `pack_credits` only when all item Price IDs resolve **or** a pack role
  resolved to a positive credit amount.
- Seat-only with fully resolved prices still clears the pack (intentional remove).

## Validation

- `npx vitest run src/lib/__tests__/credits-billing-v2.test.ts`
- New case: unrecognized pack/addon Price ID preserves `pack_credits` and grant 220.

## Out of scope / not re-opened

Tracked open PRs left alone: #930 #925 #924 #923 #911 #902 #843 #859 #881.
Merged and dropped from MEMORIES: #929.
