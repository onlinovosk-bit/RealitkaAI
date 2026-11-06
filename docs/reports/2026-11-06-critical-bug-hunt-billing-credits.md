# Critical bug hunt — billing / credits (2026-11-06)

Head: `origin/main` @ `6fb118fe` (local branch `cursor/critical-bug-hunt-2026-11-06`).
Scope: `credits-billing*`, `billing-store`, `saas-ops`, `grant-engine`, webhook / checkout fulfill.
No code fix in this hunt.

## Skipped (already tracked)

| Issue | PR |
|-------|-----|
| canceled leftover lockout (`subscriptions.data[0]`, `agencyPaysOutsideStripe` before `manual_plan`) | #938 |
| `loadAgencyBillingFacts` → `NO_AGENCY_FACTS` lockout | #934 |
| `pack_credits: 0` on unrecognized pack Price | #933 |
| legacy async fulfill fail-closed | #925 (fixed) |
| `past_due` / `paysOutsideStripe` | #877 (fixed) |
| expire repair absolute `credits_balance` write | #859 |

## NEW CRITICAL candidates

### 1. Legacy seat fulfill hardcodes `subscription_status: "active"` (no live Stripe retrieve)

- **Where:** `apps/crm/src/lib/credits-billing.ts:212` (writer); called from `apps/crm/src/lib/credits-billing-webhook.ts:63–85`
- **Contrast:** v2 plan fulfill refuses revoked live status via `loadLiveSubscriptionStatus` (`credits-billing-v2.ts:494–501`)
- **Trigger:** `checkout.session.completed` / `async_payment_succeeded` for `checkoutType=seat` is redelivered (Stripe retry, out-of-order, manual resend) after the subscription is already `canceled` / `unpaid` / `past_due` / `incomplete_expired`
- **Impact:** Restores paid `account_tier` / seats / cockpit and forces `subscription_status: "active"`. Same-period grant is idempotent; a later-month replay can also run `triggerInitialGrantAfterSeatCheckout` → **over-entitlement + possible over-grant** while Stripe says the sub is dead or delinquent
- **Confidence:** high

### 2. `hasLiveSubscription` treats non-`canceled` leftovers as live → checkout lockout

- **Where:** `apps/crm/src/lib/credits-billing-v2.ts:44` (`LIVE_SUBSCRIPTION_STATUSES` includes `unpaid`); `:265–268` (second clause: any `stripe_subscription_id` with status ≠ `canceled`); consumers `:275–280` (`hasLegacySubscription`) and `:284–286` (`hasLivePricingV2Subscription`) → `createPricingV2CheckoutSession` `:322–327`
- **Trigger:**
  - Agency left at `incomplete_expired` (or `unpaid`) with `stripe_subscription_id` still set — e.g. `syncAgencyBillingLifecycle` wrote Stripe’s status (`billing-lifecycle.ts:153–158`) and `applyPricingV2SubscriptionEvent` did not normalize to `canceled` (price-env mismatch so v2 branch skipped; or partial failure window)
  - `unpaid` is both “live” for the checkout gate and “revoked” for entitlement revoke (`REVOKED_SUBSCRIPTION_STATUSES` at `:420`)
- **Impact:** Free / revoked agency cannot open a new v2 plan checkout (`legacy_subscription` or `subscription_exists`) → **self-serve re-subscribe lockout** after abandoned or ended Stripe sub
- **Confidence:** high for `incomplete_expired` + second clause; medium-high for sticky `unpaid` when v2 apply path does not rewrite status to `canceled`

### 3. Monthly credit cron never selects `licensed_users` (v3 band source of truth)

- **Where:** `apps/crm/src/lib/credits/monthly-cycle.ts:17` (`AGENCY_GRANT_COLUMNS` omits `licensed_users`); grant math in `apps/crm/src/lib/credits/grant-engine.ts:60–66` / `:77–85`
- **Trigger:** First-of-month `runMonthlyCreditCycle`. Contract/tests require band from `licensed_users` with precedence over `pricing_band` (`grant-engine-pricing-v3.test.ts` — “licensed_users má prednosť pred uloženým pricing_band”). Cron loads rows without `licensed_users` → field is `undefined` → always falls back to `pricing_band`
- **Impact:**
  - If `pricing_band` is null/invalid but `licensed_users` is valid in DB → **monthly grant 0** (under-grant / silent miss)
  - If `pricing_band` is stale vs `licensed_users` → **wrong band grant** (under or over)
- **Confidence:** high that the select omission is real; medium that PROD rows currently diverge (writers usually set both together) — still a correctness hole against the v3 grant contract

## Cleared in this pass (no new CRITICAL)

- Pricing checkout fail-closed on webhook route (`route.ts:55–60`) including async legacy types
- v2 plan/credits `isSessionPaid` + live subscription retrieve on fulfill
- Atomic purchase/grant RPCs + starter-pack claim-before-credit
- `#925`-class async seat/topup ACK hole appears fixed on current main
