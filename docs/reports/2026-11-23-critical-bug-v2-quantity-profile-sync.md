# Critical bug — v2 quantity update leaves profiles elevated (2026-11-23)

## Bug and impact

`applyPricingV2SubscriptionEvent` on `customer.subscription.updated` rewrites
`agencies.account_tier` / band / seats from live Stripe quantity, but does **not**
update `profiles`. After an office/network checkout, `fulfillPricingV2PlanCheckout`
sets `profiles.account_tier=enterprise` and `ui_role=owner_vision`.

**Trigger:** customer buys office (7 seats), then lowers quantity to 1 in the Stripe
Billing Portal. Agency becomes `starter`; profiles stay `enterprise` /
`owner_vision`. `checkCapabilityAccess` trusts `profiles.account_tier` (enterprise
rank = Market Vision / Guardian). Workdesk `resolveAccountTier` elevates
`owner_vision` → `market_vision`. Paid capabilities remain after paying for Start.

Opposite direction (1 → 7) updates the agency to enterprise while the profile can
stay on starter until a new checkout — paid band not granted on profiles.

## Root cause

Subscription quantity path only wrote `agencies`. Profile entitlement sync existed
for checkout fulfill (payer only) and revoke/cancel (all agency profiles), but not
for live quantity/band changes.

## Fix

After a successful agency band/tier rewrite on `subscription.updated`:

1. Sync `profiles.account_tier` (+ `protocol_active: false`) for `agency_id`.
2. When the new tier is not `enterprise`, also set `ui_role: "agent"` so leftover
   `owner_vision` cannot keep Market Vision after a downgrade.
3. Do not mass-set `owner_vision` on upgrade (would escalate every agent); rank-3
   caps unlock from `account_tier=enterprise` alone.

Profile sync failure returns `false` so Stripe retries (same fail-closed posture as
agency write failure).

## Validation

```text
npx vitest run src/lib/__tests__/credits-billing-v2.test.ts
# Test Files  1 passed (1)
# Tests  83 passed (83)
```

New cases:

- quantity drop office→start syncs profiles (starter + ui_role agent)
- quantity rise to office syncs account_tier without mass owner_vision

## Out of scope (not fixed here)

- Duplicate Stripe Customer per checkout (`customer_email` only) — architectural
- Legacy monthly grant ignoring `subscription_status` after cancel — intentional
  comment in grant-engine; needs separate product decision
- Open tracked PRs #962/#963 and earlier — still awaiting review
