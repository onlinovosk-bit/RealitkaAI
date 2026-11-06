# Critical bug hunt 2026-11-02 — billing / credits / saas-ops

Head audited: `origin/main` @ `24d0eed6`. Fix branch: `cursor/critical-bug-billing-canceled-sub-lockout`.

## Scope checked

- `apps/crm/src/lib/credits-billing.ts`, `credits-billing-v2.ts`, `credits-billing-webhook.ts`
- `apps/crm/src/lib/saas-ops.ts` (+ `agencyPaysOutsideStripe` / trial gate)
- `apps/crm/src/app/api/billing/**` (+ webhook route fail-closed for async legacy — #925 merged)
- `apps/crm/src/lib/credits/grant-engine.ts`, `monthly-cycle.ts`, `mutate-credits.ts`
- `apps/crm/src/lib/starter-pack/**` (+ proxy PUBLIC_PATHS — #929 merged)
- `apps/crm/src/lib/billing-store.ts` (`getCurrentBillingStatus` / subscription pick)
- `apps/crm/src/lib/billing-lifecycle.ts`

## Skipped already-tracked (still open unless noted)

| PR | Issue |
|----|--------|
| #934 | `loadAgencyBillingFacts` error → `NO_AGENCY_FACTS` lockout |
| #933 | `subscription.updated` unrecognized pack Price → `pack_credits: 0` wipe |
| #925 | MERGED — async legacy seat/top-up/starter fail-closed |
| #859 | `expireGrantCreditsForAgency` absolute `credits_balance` repair race |
| #877 | MERGED — `past_due` leftover plan is not `paysOutsideStripe` |
| #929 | MERGED — starter-pack download PUBLIC_PATHS |

## NEW CRITICAL (fixed in this PR)

### 1. Canceled-only Stripe leftover → false `hasSubscription` → write lockout

- **Location:** `apps/crm/src/lib/billing-store.ts` — `fetchCurrentBillingStatusUncached` previously fell back to `subscriptions.data[0]` after missing active/trialing.
- **Root cause:** `subscriptions.list({ status: "all" })` returns canceled / `incomplete_expired` leftovers. `data[0]` made `hasSubscription: true` with `subscription.status = "canceled"`. `trialGraceFrom` then takes the Stripe branch (`canceled` → `limited` → `read_only`) and **never consults** `paysOutsideStripe` / `manual_plan`.
- **Concrete trigger:** Invoice / `manual_plan` tenant (PROD: 2 agencies; 7/7 lack `stripe_subscription_id`) whose login email matches a Stripe Customer that only has canceled (or expired) subscriptions — e.g. abandoned Checkout experiment. After trial window: write lockout despite paying outside Stripe.
- **Impact:** Paying reference clients lose write access (`requireActiveAppAccess`); data remains readable but CRM writes / AI gates fail closed incorrectly.
- **Fix:** `pickRelevantStripeSubscription` — only `active` | `trialing` | `past_due` | `unpaid` | `incomplete`. No `data[0]` fallback.

### 2. `manual_plan` beaten by leftover ended `subscription_status`

- **Location:** `apps/crm/src/lib/saas-ops.ts` — `agencyPaysOutsideStripe`.
- **Root cause:** `ENDED_SUBSCRIPTION_STATES` short-circuited to `false` **before** `isPayingAgency` / `manual_plan`. Leftover `canceled` / `past_due` after a Stripe trial checkout forced `paysOutsideStripe: false` even when `manual_plan` was set.
- **Concrete trigger:** `manual_plan = market_vision` + DB `subscription_status = canceled` (or `past_due`) + Stripe session `hasSubscription: false` (no live sub) + trial expired → `limited`.
- **Impact:** Same write lockout for invoice tenants; complementary to (1) when Stripe returns no relevant sub but DB still carries ended status.
- **Fix:** Non-empty `manual_plan` returns `true` first; ended-status gate applies only to non-manual rows (leftover `plan` / `account_tier` still fail-closed per #877).

## Cleared / no new CRITICAL in this pass

- Legacy seat/top-up/starter async fail-closed: present on main (#925).
- Seat initial grant fail-closed after entitlements: present on main.
- Starter-pack download PUBLIC_PATHS + HMAC fail-closed in production: present (#929).
- Atomic purchase/grant/expire RPC paths: no new race beyond open #859 repair branch.
- Pricing v2 pack wipe on unrecognized Price ID: still open as #933 (not re-fixed here).

## Latent (not CRITICAL while flags default off — noted only)

- Self-serve trial credits (`SELF_SERVE_TRIAL_CREDITS`, default 0) land in **grant** pool via `apply_monthly_grant_credits`; `runMonthlyCreditCycle` expire selects all `grant_credits_balance > 0` (no `trial_ends_at` / `billing_source` guard). Enabling signup + non-zero trial credits would wipe trial credits on month rollover while trial may still be active. Flag-off / credits=0 → blast radius 0 today.

## Validation

```bash
cd apps/crm && npx vitest run \
  src/lib/__tests__/trial-no-card.test.ts \
  src/lib/__tests__/trial-gate-closed.test.ts \
  src/lib/__tests__/billing-store.test.ts \
  src/lib/__tests__/billing-store.memo.test.ts
```
