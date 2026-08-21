---
id: MSG-20260821-005-result-billing-bugs-371-374-zisti
type: result
status: done
owner: cursor-agent
created_at: 2026-08-21T17:23:47Z
updated_at: 2026-08-21T17:23:47Z
scope:
  repo_paths:
    - apps/crm/src/lib/billing-store.ts
    - apps/crm/src/app/api/billing/webhook/route.ts
    - apps/crm/src/lib/credits/grant-engine.ts
    - apps/crm/src/lib/credits/monthly-cycle.ts
  external_systems:
    - github (read-only)
    - supabase prod (read-only attempted; unavailable in this environment)
evidence:
  commands:
    - git rev-parse origin/main
    - gh pr view 371 374 392 401
    - git diff origin/main...origin/cursor/critical-bug-management-7e01
    - git diff origin/main...origin/cursor/critical-bug-management-84af
  files:
    - apps/crm/src/lib/billing-store.ts
    - apps/crm/src/app/api/billing/webhook/route.ts
    - apps/crm/src/app/api/billing/webhook/__tests__/route.test.ts
    - apps/crm/src/lib/credits/grant-engine.ts
    - apps/crm/src/lib/credits/monthly-cycle.ts
  urls:
    - https://github.com/onlinovosk-bit/RealitkaAI/pull/371
    - https://github.com/onlinovosk-bit/RealitkaAI/pull/374
    - https://github.com/onlinovosk-bit/RealitkaAI/pull/392
    - https://github.com/onlinovosk-bit/RealitkaAI/pull/401
next_action:
  gate: GO REQUIRED
  description: Founder runs impact SQL on PROD; then GO to implement fresh fixes against main (do not rebase stale #371/#374 blindly).
---

# ZISTI — billing bugs #371 and #374 vs current main

## Summary

Against `origin/main` `d0d7496c` (includes merged #422, #449, #392, #401):

| Bug | PR | Still present on main? | Covered by #392/#401? |
|---|---|---|---|
| Legacy Stripe webhook can wipe paid tier to `free` after seat/top-up checkout | #371 OPEN | **YES** | **NO** |
| Monthly credits-cycle retry can wipe freshly granted monthly pool | #374 OPEN | **YES** | **NO** |

#392 = starter-pack claim-before-grant (different hole).
#401 = fail-closed ACK when pricing fulfillment returns false (different hole).
Neither removes the dual-handler wipe nor the expire-then-retry wipe.

**STOP before implementation.** This message is discovery only.

---

## Bug A — #371 legacy webhook tier wipe

### Status on main: STILL EXISTS

Route still runs pricing fulfillment **and then** legacy handler on success:

```ts
// apps/crm/src/app/api/billing/webhook/route.ts
const pricingOk = await handlePricingCheckoutWebhook(event);
if (isPricingCheckoutSession(event) && !pricingOk) {
  return 500; // #401 — good
}
await handleStripeWebhookEvent(event); // always after success
```

Webhook unit test on main still asserts legacy runs after successful pricing ACK (`mockLegacy` called). That documents the remaining hazard.

Legacy checkout path on main (no `isPricingCheckoutMetadata` guard):

```ts
// billing-store.ts handleStripeWebhookEvent — checkout.session.completed
const priceId = object.metadata?.planKey
  ? BILLING_PLANS.find(...)?.priceId
  : undefined; // seat/top-up sessions: no planKey → undefined
if (authUserId) {
  await syncAccountTier(authUserId, priceId, { byAuthUserId: true, resetLock: true });
}
```

`resolvePlanKeyFromStripePriceId(undefined)` → `"free"`.
Seat Stripe price IDs are **not** mapped in `resolvePlanKeyFromStripePriceId` on main → `customer.subscription.created/updated` after seat checkout also defaults unknown seat prices to `"free"`.

### Reproduction scenario (code-path)

1. Broker completes Team/Office **seat** Checkout (`metadata.checkoutType=seat`, `authUserId` set, **no** `planKey`).
2. Stripe sends `checkout.session.completed`.
3. `handlePricingCheckoutWebhook` applies seats / profile entitlements correctly → returns `true`.
4. Route ACKs path continues into `handleStripeWebhookEvent`.
5. Legacy resolves `priceId=undefined` → syncs `profiles.account_tier=free` / `ui_role=agent` for that `authUserId`.
6. Optional second wipe: Stripe `customer.subscription.created` with seat price ID unknown to legacy resolver → free again.

Credit top-up / starter-pack with `authUserId` and no `planKey` hit the same checkout wipe path.

### Proposed fix against **today's** main (do not rebase #371 blindly)

Fresh PR from `main`:

1. Port `isPricingCheckoutMetadata` + skip legacy `syncAccountTier` for `seat` / `credit_topup` / `starter_pack` on `checkout.session.completed`.
2. Map `SEAT_TIERS` / `SEAT_TIER_STRIPE_ENV` → `SEAT_TIER_CONFIG[tier].planKey` inside `resolvePlanKeyFromStripePriceId`.
3. Keep #401 fail-closed ACK behavior unchanged.
4. Add/port tests from #371 branch; re-run billing verification suite on current main.
5. Expect conflict with stale #371 tip — prefer cherry-pick of the logical hunks onto new branch, not force-rebase of old tip without review.

### Customer impact (#371)

**Count not obtained.** This cloud environment only has local Supabase (`127.0.0.1:54321`, down). Supabase MCP is `needsAuth`. No PROD SELECT executed.

Founder-run **read-only** probes (no writes):

```sql
-- A1: seated agencies whose profiles are free (possible wipe survivors)
SELECT a.id AS agency_id,
       a.seats,
       a.account_tier AS agency_tier,
       count(*) FILTER (WHERE p.account_tier = 'free') AS free_profiles,
       count(*) AS profiles_total
FROM agencies a
JOIN profiles p ON p.agency_id = a.id
WHERE a.seats > 0
GROUP BY a.id, a.seats, a.account_tier
HAVING count(*) FILTER (WHERE p.account_tier = 'free') > 0
ORDER BY free_profiles DESC;

-- A2: activity breadcrumbs if billing activities were logged around wipe
SELECT id, title, created_at, meta
FROM activities
WHERE source = 'billing'
  AND created_at > now() - interval '90 days'
ORDER BY created_at DESC
LIMIT 200;
```

Until A1 returns, report impact as **UNKNOWN (query pending)** — not an estimate.

---

## Bug B — #374 credits-cycle retry wipe

### Status on main: STILL EXISTS

`expireGrantCreditsForAgency` on main still maps ledger/agency DB errors to `{ skipped: true }` with **no `error` field**.

`runMonthlyCreditCycle` on main:

1. Expires previous period for all agencies with `grant_credits_balance > 0`.
2. Always grants current period for `seats > 0`.
3. Returns `ok: true` even when individual expires soft-failed.
4. Comment still claims retries are safe via idempotency alone — that claim is false for the partial-fail ordering.

### Reproduction scenario (code-path)

1. On cycle day, `expireGrantCreditsForAgency(agency, previousPeriodKey)` hits ledger insert error → `{ skipped: true }` (no hard fail).
2. Same run grants successfully → ledger row `grant:{agencyId}:{YYYYMM}`, balance includes new grant.
3. Cron/ops retries `credits-cycle` or deprecated `credits-expire`.
4. Expire for `previousPeriodKey` has **no** expiry ledger row yet → zeros **current** `grant_credits_balance` under last-month key.
5. Grant no-ops via monthly grant idempotency → customer sits at 0 grant credits (purchased pool untouched).

### Proposed fix against **today's** main (do not rebase #374 blindly)

Fresh PR from `main`:

1. Port expire guard: refuse expire when current-period grant ledger exists.
2. Surface expire DB failures via `error`; skip grant for those agencies; return `ok: false` so cron retries.
3. Repair path when expiry ledger exists but balance uncleared and no current grant.
4. Port monthly-cycle + grant-engine tests from #374 onto current main.
5. Treat stale #374 tip as reference patch, not merge base.

### Customer impact (#374)

**Count not obtained** (same PROD access gap).

Founder-run **read-only** probes:

```sql
-- B1: seated agencies currently at zero grant (symptom class, not proof of wipe)
SELECT id, seats, account_tier, grant_credits_balance, purchased_credits_balance
FROM agencies
WHERE seats > 0 AND coalesce(grant_credits_balance, 0) = 0
ORDER BY purchased_credits_balance DESC;

-- B2: same-day grant then expiry pattern (stronger wipe signal)
WITH grants AS (
  SELECT agency_id, ref AS period, created_at, idempotency_key
  FROM credit_ledger
  WHERE reason = 'monthly_grant'
),
expiries AS (
  SELECT agency_id, ref AS period, created_at, idempotency_key, delta
  FROM credit_ledger
  WHERE reason = 'grant_expiry'
)
SELECT g.agency_id, g.period AS grant_period, e.period AS expiry_period,
       g.created_at AS granted_at, e.created_at AS expired_at, e.delta
FROM grants g
JOIN expiries e
  ON e.agency_id = g.agency_id
 AND e.created_at > g.created_at
 AND e.created_at < g.created_at + interval '2 days'
ORDER BY e.created_at DESC
LIMIT 100;
```

Until B2 returns, impact = **UNKNOWN (query pending)**.

---

## What #392 / #401 did NOT fix

| Merged PR | Hole closed | Relation to #371/#374 |
|---|---|---|
| #392 | Starter-pack multi-agency double redeem (claim-first) | Orthogonal |
| #401 | HTTP 200 despite failed pricing fulfillment; top-up balance update ignore | Orthogonal; **preserves** dual-handler success path that enables #371 |

---

## Recommended implementation order (after GO + impact SQL)

1. Fresh `fix/billing-legacy-webhook-tier-guard` from main → #371 logic.
2. Fresh `fix/credits-cycle-expire-guard` from main → #374 logic.
3. Close stale #371/#374 without merging them once fresh PRs land (or supersede explicitly).
4. Do **not** batch with branch-deletion cleanup.

## Next action

**STOP.** No billing code changes in this turn.
Founder: run A1/B2 SQL on PROD → paste counts → GO for fresh fix PRs.
