# Critical bug hunt 2026-11-15 — billing / auth (listed hotspots)

Head audited: `origin/main` @ `c0ed01e9`.
Fix branch: `cursor/critical-bug-remediation-ebfa`.

## Scope

Deep read of:

1. `apps/crm/src/lib/credits-billing-v2.ts` (subscription.updated, revoke, hasLiveSubscription, pack_credits)
2. `apps/crm/src/lib/credits-billing.ts` (checkout fulfillment)
3. `apps/crm/src/lib/billing-store.ts` + `saas-ops.ts` `trialGraceFrom` after #938
4. `apps/crm/src/lib/billing-lifecycle.ts`
5. `apps/crm/src/app/api/profiles/[id]/route.ts`
6. `apps/crm/src/app/api/team/users/route.ts` + `team/teams/route.ts`
7. `apps/crm/src/lib/ceo-command/access.ts`

Skipped already-tracked (open PRs): #952 #951 #948 #946 #945 #944 #942 #934 #933 #930 #924 #923 #911/#902 #843 #859 #881.

## NEW CRITICAL (1)

### 1. Pricing v2 unpaid revoke → DB `canceled` opens duplicate Checkout

| | |
|---|---|
| **Location** | `apps/crm/src/lib/credits-billing-v2.ts` — `revokePricingV2Agency` / `applyPricingV2SubscriptionEvent` |
| **Root cause** | On Stripe `unpaid`, revoke downgraded entitlements correctly (`account_tier=free`, `pack_credits=0`) but **rewrote** `subscription_status` to `"canceled"`. `hasLiveSubscription` treats `unpaid` as LIVE (blocks plan Checkout) but exempts `canceled`. `stripe_subscription_id` was left pointing at the still-open Stripe unpaid subscription. `createPricingV2CheckoutSession` only consults DB → allowed a second plan Checkout. |
| **Trigger** | 1) v2/v3 agency with live seat subscription. 2) Invoices exhaust retries → Stripe `customer.subscription.updated` status=`unpaid`. 3) Webhook revoke maps DB status to `canceled`. 4) User opens Upgrade / plan Checkout again → `hasLivePricingV2Subscription` false → new Stripe subscription created beside the unpaid one. |
| **Impact** | Incorrect billing: duplicate recurring subscription / double charge risk; entitlement thrash when the old unpaid invoice is later paid (`subscription.updated`→`active`) while a second sub also exists. High severity billing correctness. |

**Fix (this PR):** preserve Stripe `unpaid` in DB on revoke; only normalize terminal `canceled` / `incomplete_expired` to `canceled`. Unpaid remains LIVE → `subscription_exists` until the customer pays the existing invoice (or the sub is truly deleted).

## Cleared (no NEW high-severity)

| Area | Notes |
|---|---|
| `hasLiveSubscription` / `incomplete_expired` leftover lockout | Already #945 |
| `pack_credits: 0` on unrecognized pack Price | Already #933 |
| `applySeatCheckoutEntitlements` hardcodes `active` | Already #946 |
| `pickRelevantStripeSubscription` + `trialGraceFrom` invoice leftover after #938 | Already #951 (`incomplete` / `past_due`+`paysOutsideStripe`) |
| `loadAgencyBillingFacts` → `NO_AGENCY_FACTS` | Already #934 |
| `billing-lifecycle` × v2 seat prices | Does not remap v3 quantity when price is not a legacy seat env; revoke free-tier only — no new wipe |
| `profiles/[id]` PATCH | ASSIGNABLE_ROLES + owner gate + self-role block present (#939 class fixed) |
| `team/users` + `team/teams` POST | Owner/founder + agency from caller (#935 class fixed) |
| `ceo-command/access.ts` | DB `role` only; does not trust billing `ui_role` (#941 fixed) |
| Credits checkout fulfill | Agency id from server metadata; paid gate; atomic purchase RPC |

## Validation

```bash
cd apps/crm && npx vitest run src/lib/__tests__/credits-billing-v2.test.ts
```
