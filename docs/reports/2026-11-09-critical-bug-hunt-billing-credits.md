# Critical bug hunt — CRM billing / credits (2026-11-09)

Head verified: `origin/main` @ `c5a23644` (work branch `cursor/critical-bug-remediation-2f4e` at same SHA).
Scope: data loss, paid-entitlement lockout/over-grant, silent credit wipe, auth/billing bypass.
Report-only (no fix this run).

## Already tracked — not re-reported

| PR | Issue | Status on this head |
|----|--------|---------------------|
| #945 | `hasLiveSubscription`: `incomplete_expired` leftover + `stripe_subscription_id` treated as live → v2 checkout lockout | OPEN — still present at `credits-billing-v2.ts:265-268` |
| #938 | canceled / `incomplete_expired` Stripe leftover → false `hasSubscription` lockout | **MERGED** (`c5a23644`) |
| #934 | `loadAgencyBillingFacts` error → `NO_AGENCY_FACTS` lockout | OPEN — still present |
| #933 | `subscription.updated` unrecognized pack Price → `pack_credits: 0` | OPEN — still present at `credits-billing-v2.ts:775` |
| #859 | expire grant repair absolute `credits_balance` from cron snapshot | OPEN — repair branch still absolute at `grant-engine.ts:203-220` |
| #925 | async checkout fulfill ACK hole | MERGED / fixed on main |

## Prior untracked candidates — verdict

### 1) `applySeatCheckoutEntitlements` hardcodes `subscription_status: "active"` — **CONFIRMED HIGH**

- **File:line:** `apps/crm/src/lib/credits-billing.ts:212` (caller `credits-billing-webhook.ts:63-75`)
- **Defect:** Legacy seat fulfillment writes `subscription_status: "active"` (+ paid `account_tier` / seats / profile tier) from Checkout session metadata. No `subscriptions.retrieve`. Pricing v2 already refuses revoked live status via `loadLiveSubscriptionStatus` (`credits-billing-v2.ts:427-501`).
- **Concrete trigger:**
  1. Agency completes legacy seat Checkout (`checkoutType: "seat"` — still offered from `upgrade/page.tsx` and `/api/billing/credits/checkout`).
  2. Later cancels (or sub becomes `unpaid` / `incomplete_expired`); `syncAgencyBillingLifecycle` / revoke sets agency to free.
  3. Stripe redelivers `checkout.session.completed` / `async_payment_succeeded` (Dashboard resend, destination replay, or delayed out-of-order delivery after `customer.subscription.deleted`).
  4. Webhook re-runs `applySeatCheckoutEntitlements` → restores paid tier + `subscription_status: "active"` even though Stripe sub is dead.
- **Blast radius:** Every legacy seat-checkout tenant. Restores paid CRM tier / seats / optional profile `ui_role` without a live subscription. May also re-attempt initial monthly grant (`triggerInitialGrantAfterSeatCheckout`); grant ledger is idempotent per period, entitlement restore is not.
- **Confidence:** **high**
- **Why not already fixed:** #845 / v2 fulfillment added live Stripe retrieve; legacy seat path never got the same gate. No open PR for this candidate (verified 2026-11-09). Still live on `c5a23644`.

### 2) `AGENCY_GRANT_COLUMNS` omits `licensed_users` — **CONFIRMED MED**

- **File:line:** `apps/crm/src/lib/credits/monthly-cycle.ts:17` (consumed `grant-engine.ts:60-67`, `77-85`)
- **Defect:** Grant cron selects `pricing_model, pricing_band, pack_credits, subscription_status` but not `licensed_users`. `grantBandOf` prefers `licensed_users` (v3 SoT); when the field is absent from the row it falls back to stored `pricing_band`.
- **Concrete trigger:** Active `pricing_model = 'v2'` agency where `licensed_users` is correct but `pricing_band` is null or stale vs seat quantity. Monthly `credits-cycle` then under-grants (null band → amount 0, soft-skip, cron `ok: true`) or over/under-grants vs the band implied by `licensed_users`. Unit tests explicitly lock “`licensed_users` wins over stale `pricing_band`” (`grant-engine-pricing-v3.test.ts`), but cron never supplies the column.
- **Blast radius:** All v2/v3 agencies on monthly grant. Practical divergence is limited while webhook writers always set `licensed_users` + `pricing_band` together (`credits-billing-v2.ts:520-521`, `771-773`); severity rises as soon as those drift (ops edit, partial migration, future writer bug).
- **Confidence:** **medium** (code defect high; live over/under-grant needs band≠users divergence)
- **Why not already fixed:** v3 grant math landed in #884; monthly-cycle select was extended for v2 fields but never added `licensed_users`. No open PR. Still live on `c5a23644`.

## NEW high-confidence bugs

**NONE**

Scanned end-to-end (no additional high-confidence critical beyond the confirmed prior candidates and already-tracked PRs):

- `credits-billing.ts` / `credits-billing-v2.ts` / `credits-billing-webhook.ts`
- `billing-store.ts` (`pickRelevantStripeSubscription`, `syncAccountTier`, webhook dispatch)
- `billing-lifecycle.ts`
- `saas-ops.ts` (`agencyPaysOutsideStripe`, `loadAgencyBillingFacts`)
- `grant-engine.ts`, `monthly-cycle.ts`, `mutate-credits.ts`
- `app/api/billing/webhook/route.ts`, `app/api/billing/credits/checkout/route.ts`
- Deprecated `credits-grant` / `credits-expire` (not in `vercel.json`; footgun if manually invoked — omits `pricing_model` → v2 rows fall through legacy seat math — not counted as high-confidence automatic path)
- Legacy cancel profile downgrade via `syncAccountTier` + unpaginated `listUsers()` — real footgun when auth user count > default page, but confidence for current prod exploit left at medium (not elevated to NEW HIGH here)

## Cleared / still sound in scope

- v2 plan checkout: live retrieve + revoked-status refuse (`fulfillPricingV2PlanCheckout`)
- Webhook pricing fail-closed for completed + async (`webhook/route.ts` + `#925`)
- Atomic purchase / monthly grant / expire RPCs (`mutate-credits.ts`)
- `#938` canceled leftover pick on billing status (merged at audited head)
