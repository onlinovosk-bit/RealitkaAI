# Critical bug hunt — pricing/billing commits (2026-10-21)

Head: `f65cb9a1` (`cursor/critical-bug-detection-046d`). Main tip at scan: `ddea820c` (+ pricing commits below on history).

## Scope

Commits / PRs: `#909` `6e9821ba`, `#908` `a04bc5eb`, `#884` `899cbfeb`, `#845` `57796f25`, `#867` `661d9f0d`.

Paths traced: `pricing-v2.ts` tiers → `buildPricingV2PlanCheckoutParams` / `createPricingV2CheckoutSession` → webhook `handlePricingCheckoutWebhook` → `fulfillPricingV2PlanCheckout` / `fulfillPricingV2CreditsCheckout` → `applyPricingV2SubscriptionEvent` + `syncAgencyBillingLifecycle` → `monthlyGrantAmountForAgency` / seat quantity.

Skipped (open PRs, per brief): `#877`, `#859`, `#843`/`#883`, `#881`, `#902`.

## CRITICAL findings (HIGH confidence + concrete trigger)

### 1. Legacy seat / credit_topup fulfill without `payment_status` (v2 fixed in `#845`; legacy left open)

**File:line:** `apps/crm/src/lib/credits-billing-webhook.ts:40-84` (seat + credit_topup); contrast `apps/crm/src/lib/credits-billing-v2.ts:393-395,463-465,586-588` (`isSessionPaid`). Async: lines `26-38` ignore `async_payment_succeeded` for legacy.

**Trigger:** Customer pays legacy seat or top-up with an async method (e.g. SEPA). Stripe sends `checkout.session.completed` with `payment_status: "unpaid"`. Legacy branch calls `applySeatCheckoutEntitlements` (hardcodes `subscription_status: "active"`) or `applyTopupPurchase` with no paid check. Later `async_payment_succeeded` is ignored for seat/topup (`return false` after v2 handlers; pinned in tests as “legacy behaviour unchanged”).

**Blast radius:** Every legacy seat/top-up Checkout that completes unpaid: free seats and/or purchased credits before money clears; if payment later fails, entitlements remain. Affects the live path while `PRICING_V2_ENABLED` is off (default) and seat/topup prices are configured.

**Confidence:** HIGH (code + tests explicitly preserve the gap `#845` closed only for v2).

### 2. Seat webhook ACKs Stripe even when initial credit grant fails

**File:line:** `apps/crm/src/lib/credits-billing-webhook.ts:65-68`.

**Trigger:** Seat Checkout paid → entitlements OK → `triggerInitialGrantAfterSeatCheckout` / `grantMonthlyCreditsForAgency` fails or soft-skips (service-role blip, RPC error). Handler still `return ok` (true) → route 200 → Stripe stops retrying.

**Blast radius:** Agency gets seats/`active` but **0 initial grant credits** until monthly cron (up to ~1 month). v2 plan fulfill returns `false` on grant failure so Stripe retries — legacy does not.

**Confidence:** HIGH.

### 3. Single current env Price ID: catalog rotate orphans v3 subscription sync

**File:line:** `apps/crm/src/lib/credits-billing-v2.ts:70-87` (`resolvePricingV2PriceRole`), `91-97` (`subscriptionHasPricingV2Price`), `618-637` (`readPricingV2SubscriptionItems`); router `apps/crm/src/lib/billing-store.ts:551-557`. Live catalog: `scripts/ops/stripe-v2/stripe_live_catalog.py` never mutates mismatched existing Prices (`lookup_key` stable across `#908`/`#909`).

**Trigger:**
1. Agency completes `pricing_v2` Checkout while `STRIPE_PRICE_V3_SEAT_MONTHLY|YEARLY` = `price_OLD`.
2. `#908`/`#909` change graduated tiers; ops creates a **new** Stripe Price (script refuses to rewrite a mismatched Price on the same `lookup_key`) and points env at `price_NEW`.
3. Any later `customer.subscription.updated` (quantity change in Customer Portal, renewal metadata, status flip).
4. Event items still carry `price_OLD` → `subscriptionHasPricingV2Price` false → `applyPricingV2SubscriptionEvent` never runs; `readPricingV2SubscriptionItems` cannot see the seat line → CRM `licensed_users` / `seats` / `pricing_band` / `pack_credits` freeze at pre-rotate values while Stripe bills the live quantity/price.

**Blast radius:** All v3 agencies whose subscription item Price ID ≠ current env after a required catalog rotate for `#908`/`#909`. Over-entitlement (CRM seats high, Stripe quantity cut) or under-entitlement (paid more seats, CRM stuck). Same mechanism zeroes `pack_credits` when pack Price env rotates but the pack item remains on the old ID.

**Confidence:** HIGH for the code/ops interaction; production exposure today is gated on there being v3 subscribers before the next Price ID swap (Stripe krok C still 0 % per session memory — landmine on the documented GO path, not a current PROD incident).

## Checked clean (no NEW HIGH wrong-charge bug in v3 money path)

- `PRICING_V3_SEAT_TIERS` / `licenseNetCents` for n=1…100 match `#908`/`#909` checkpoints (2→50 € base, 3–5→65 €, A+ 21+ graduated including year `flat_amount: 3`).
- Checkout: quantity = seats, fail-closed missing Price IDs / promo coupon (`#867` / `missingPricingV2PriceEnvKeysForRequest`), no client `agencyId`.
- v2 fulfill: `isSessionPaid`, live subscription retrieve before activate (`#845`), grant failure → false.
- `#867` paths remain fail-closed (no silent checkout with placeholder Price IDs).

## Not raised as CRITICAL (below bar / not enforced)

- `getSaasOpsSnapshot` drops seat `quantity` when calling `saasPlanKeyFromPriceId` → always resolves recognized v3 seat → `"starter"` limits in the snapshot UI (`saas-ops.ts:519-520`). `getCurrentPlanKey` passes quantity correctly. `requireLimitAvailable` is unused by API routes; feature flags are still all-true — display skew, not charge/wipe.

## Next (GO)

1. Align legacy seat/topup with `isSessionPaid` + honor `async_payment_succeeded` (finding 1).
2. Return false from seat webhook unless grant ok or already idempotently granted (finding 2).
3. Before any `#908`/`#909` Price ID env swap: support multiple historical seat/pack Price IDs in `resolvePricingV2PriceRole`, or migrate subscription items to the new Price in Stripe in the same change window (finding 3).
