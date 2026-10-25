# Critical bug hunt — credits / billing / saas-ops (2026-10-25)

Scope: full call chains in `grant-engine`, `monthly-cycle`, `credits-billing*`, `billing-store`, `saas-ops`.  
No code fixes. Head of this branch: after `origin/main` @ `2f7cb14c` (#917) plus prior hunt docs on this branch.

## Skipped (already tracked)

| Item | Why |
|------|-----|
| `expireGrantCreditsForAgency` repair absolute write | #859 |
| `agencyPaysOutsideStripe` / `past_due` | #877 |
| Matching LIST_MAX / empty wipe | #924, #843, #883 |
| Outreach agency fallback | #923 |
| Gmail markError/markPulled | #911, #902 |
| `acquire_dedup_keys` global PK | #881 |

## NEW CRITICAL

### 1. Seat / top-up `async_payment_succeeded` fulfillment failure → silent HTTP 200

- **Where:** `apps/crm/src/app/api/billing/webhook/route.ts:14-31` (`isPricingCheckoutSession`) + gate at `:48-54`
- **Handler does fulfill:** `apps/crm/src/lib/credits-billing-webhook.ts:32-107` (seat/top-up on async when `payment_status` paid)
- **Trigger:** SEPA (or other async method) seat or `credit_topup` checkout → `checkout.session.completed` with `unpaid` ACKs without fulfill (#916) → later `async_payment_succeeded` runs fulfill → DB/RPC/transient error returns `false` from `handlePricingCheckoutWebhook`.
- **Why Stripe stops:** `isPricingCheckoutSession` treats async as pricing only for `pricing_v2` / `pricing_v2_credits`. For `seat` / `credit_topup`, async is `false`, so the `!pricingOk → 500` gate never runs → route returns 200.
- **Impact:** Customer paid; seats or purchased credits never applied; Stripe will not retry. Permanent stuck fulfillment.
- **Confidence:** **high** (explicit unit test locks the hole: `route.test.ts` “async_payment_succeeded for a legacy type keeps today's behaviour (not guarded)” expects 200 on `pricingOk=false`).
- **Fix obvious:** **yes** — include `seat` and `credit_topup` in the async branch of `isPricingCheckoutSession` (same as v2); flip the test to expect 500.

### 2. Starter pack fulfills on unpaid `completed` (no `isSessionPaid`)

- **Where:** `apps/crm/src/lib/credits-billing-webhook.ts:110-118`
- **Trigger:** `checkoutType=starter_pack` + `checkout.session.completed` with `payment_status=unpaid` (async payment pending). Branch does **not** call `isSessionPaid`. It calls `fulfillStarterPackPurchase` immediately (inserts redemption code, emails download). On `async_payment_succeeded` the handler returns `false`; route does not treat starter_pack async as a guarded pricing session → 200.
- **Impact:** Redeemable credit code + download issued before money clears. If payment later fails, codes remain. Inverse of seat/top-up (which wait for paid).
- **Confidence:** **high**
- **Fix obvious:** **yes** — same gate as seat/top-up: ACK unpaid completed without fulfill; fulfill on async when paid; fail-closed 500 on fulfill failure; revoke/noop path if needed for `async_payment_failed`.

### 3. `subscription.updated` zeros `pack_credits` when pack Price ID is unrecognized

- **Where:** `apps/crm/src/lib/credits-billing-v2.ts:767-775` via `readPricingV2SubscriptionItems` (`:618-637`) and `resolvePricingV2PriceRole` (env-only Price IDs)
- **Trigger:** Agency has live v2 subscription with seat + monthly pack. Ops rotates pack Stripe Price / env (`PRICING_V2_PACK_PRICE_ENV`) so the **seat** price still matches current env but the **pack** line does not. Any `customer.subscription.updated` (renewal, quantity change, status blip) runs `applyPricingV2SubscriptionEvent`: seat item resolves → `band`/`seatQuantity` set → `packCredits` defaults to `0` → `update.pack_credits = 0`.
- **Impact:** Paid pack entitlement wiped from `agencies.pack_credits`. Next `monthlyGrantAmountForAgency` under-grants by the pack amount every month until repaired. Not a ledger wipe of purchased pool, but silent loss of paid grant component.
- **Confidence:** **high** on code path; **med** on near-term prod (needs catalog/env rotate with leftover pack subscriptions). Related to prior “price ID freeze” landmine; this is the sharper case where seat still matches so update proceeds and **zeros** pack instead of freezing.
- **Fix obvious:** **yes** — only write `pack_credits` when a pack line is recognized (or preserve previous when subscription still has an unmatched pack-shaped item); keep legacy Price ID aliases across rotates.

## Checked — no NEW critical in scope

- **`grantMonthlyCreditsForAgency` / concurrent top-up:** writes go through `apply_monthly_grant_credits` / `apply_credit_purchase` with `FOR UPDATE` (`20260804230000_atomic_credit_mutations.sql`). Happy-path race from pre-atomic RMW is closed. Remaining absolute write is only the **#859** expiry repair branch.
- **`runMonthlyCreditCycle`:** expire-then-grant order; expire hard-fail skips grant for that agency; grant hard-fail → `ok:false` (cron retry). `AGENCY_GRANT_COLUMNS` omits `licensed_users` (falls back to `pricing_band`); band/users are written together in fulfillment/lifecycle today → not elevated to critical without a desync write path.
- **Legacy seat completed path after #916:** `isSessionPaid`, 0-row UPDATE → false, initial grant error → false, completed fail → route 500. Residual hole is **async fail-closed** (bug 1), not the completed path.
- **v2 plan/credits webhook:** paid gate, live subscription retrieve, 0-row fail, grant fail → false; async included in `isPricingCheckoutSession`.
- **`saas-ops` / `agencyPaysOutsideStripe`:** `ENDED_SUBSCRIPTION_STATES` still omits `past_due` (#877 only). `loadAgencyBillingFacts` error → `paysOutsideStripe:false` can falsely limit invoice payers on DB blip — access lock, not credit wipe; not filed as new critical here.
- **`billing-store` `syncAccountTier`:** `unknown` price is no-op (no free wipe). Lifecycle revoke still sets `account_tier=free` on unpaid/canceled by subscription id / careful customer fallback.

## Evidence anchors

```14:31:apps/crm/src/app/api/billing/webhook/route.ts
function isPricingCheckoutSession(event: Stripe.Event): boolean {
  const checkoutType = (event.data.object as Stripe.Checkout.Session).metadata?.checkoutType;
  if (
    event.type === "checkout.session.async_payment_succeeded" &&
    (checkoutType === PRICING_V2_CHECKOUT_TYPE_PLAN || checkoutType === PRICING_V2_CHECKOUT_TYPE_CREDITS)
  ) {
    return true;
  }
  if (event.type !== "checkout.session.completed") return false;
  // seat / credit_topup / starter_pack only on completed — not async
```

```110:118:apps/crm/src/lib/credits-billing-webhook.ts
  if (checkoutType === "starter_pack") {
    if (isAsyncPaid) return false;
    const result = await fulfillStarterPackPurchase({
      stripeSessionId: session.id,
      customerEmail: session.customer_details?.email ?? session.customer_email,
    });
    return result !== null;
  }
```

```767:775:apps/crm/src/lib/credits-billing-v2.ts
  const { band, seatQuantity, packCredits } = readPricingV2SubscriptionItems(subscription);
  if (band && seatQuantity !== null) {
    ...
    update.pack_credits = packCredits; // 0 when pack Price ID not in current env
  }
```
