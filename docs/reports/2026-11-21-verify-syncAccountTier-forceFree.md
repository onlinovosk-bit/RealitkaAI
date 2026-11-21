# Independent VERIFY — syncAccountTier status-blind + forceFree listUsers

Head: `origin/main` @ `0437f80d`.
Mode: read-only re-audit of alleged CRITICAL bugs. Prior hunt report on branch `cursor/bc-d71cfa0e-f468-42ed-94d8-87261c7a4c6e-a11c` was **not trusted**; code on main was re-read.

## Claim 1 — `syncAccountTier` maps price → paid profile without `subscription.status`

### Verdict: **VERIFIED** (with one overstatement)

| Piece | Result |
|-------|--------|
| No status gate in `syncAccountTier` | **VERIFIED** `apps/crm/src/lib/billing-store.ts:77–131` — tier from `forceFree` or `resolvePlanKeyFromStripePriceId(priceId)` only |
| Callers on `created` / `updated` pass price, not status | **VERIFIED** `:617–619` (`customer.subscription.created`), `:652–656` (`customer.subscription.updated`) |
| `forceFree` only on `deleted` | **VERIFIED** `:672–673` |
| Agency free while profile paid on `unpaid` / `incomplete_expired` | **VERIFIED** — `syncAgencyBillingLifecycle` revokes agency (`billing-lifecycle.ts:35–36,154–164`) then webhook still runs `handleStripeWebhookEvent` → `syncAccountTier` with price (`webhook/route.ts:66–76`) |
| Same split on `past_due` (“agency free”) | **REJECTED** — `past_due` is **not** in `REVOKING_STATUSES`; agency plan intentionally kept |

### Production path (not theoretical)

Webhook order today (`apps/crm/src/app/api/billing/webhook/route.ts`):

1. pricing checkout fulfill  
2. `syncAgencyBillingLifecycle`  
3. `handleStripeWebhookEvent` → legacy `syncAccountTier` **unless** `subscriptionHasPricingV2Price`

**Who still hits `syncAccountTier`:**

- Any subscription whose Stripe price IDs are **not** v2/v3 (`subscriptionHasPricingV2Price` false).
- Includes: legacy seat prices (`SEAT_TIER_STRIPE_ENV` mapped at `billing-store.ts:765–771`), classic `STRIPE_PRICE_STARTER|PRO|ENTERPRISE|…`, legacy add-ons (`:736–748`).
- Pricing v2/v3 subscriptions **bypass** this function and correctly revoke profiles in `revokePricingV2Agency` (`credits-billing-v2.ts`).

**Still sold / callable today:**

- `POST /api/billing/credits/checkout` with `checkoutType: "seat"` still creates legacy seat Checkout when seat price env is configured (`credits/checkout/route.ts` seat branch — independent of `PRICING_V2_ENABLED`).
- `POST /api/billing/checkout` + `createBillingCheckoutSession` still sells classic plan subscriptions (`billing-store.ts:285+`, `mode: "subscription"`).
- CRM `isPricingV2Enabled()` defaults **off**; when on, **new** v2 buyers avoid this bug, but the legacy webhook branch remains live for non-v2 prices / existing legacy subs.

**Concrete triggers that work on current code:**

1. **Incomplete pre-pay:** legacy seat/plan Checkout → Stripe `customer.subscription.created` with `status=incomplete` → `syncAccountTier` writes paid `profiles.account_tier` / `ui_role`. Seat fulfill waits for `payment_status=paid` (`credits-billing-webhook.ts` `isSessionPaid`). Lifecycle does **not** run on `created`. Profile paid while agency not yet entitled.
2. **Unpaid / incomplete_expired:** live legacy sub → `customer.subscription.updated` → lifecycle sets agency `account_tier=free` + `subscription_status=unpaid|incomplete_expired` → `syncAccountTier` **re-applies** paid profile from line-item price. No `deleted` → no `forceFree`.

### Blast radius

**Not full “paid CRM after unpaid”.** `trialGraceFrom` still puts Stripe `unpaid`/`past_due` into grace/blocked and `canceled`/`incomplete_expired` into limited (`saas-ops.ts`), using live Stripe status when lookup succeeds.

**Real privilege class:** gates that trust `profiles.account_tier` / `ui_role` without subscription status — e.g. dashboard/menu (`resolveAccountTier`), `checkEnterpriseAccess`, hub `get-tier`, stealth-recruiter `checkCapabilityAccess`, team/trh UI. Split-brain: agency free/unpaid vs profile paid.

**Severity rating:** **MEDIUM–HIGH** (profile entitlement / UI privilege), **not** unqualified CRITICAL “full paid after cancel/unpaid” given write lockout. Escalate toward CRITICAL if product treats profile-tier APIs as the security boundary.

### Minimal fix

Obvious: gate `syncAccountTier` / callers on live status ∈ `{active, trialing}` (product choice for `past_due`); on `unpaid|incomplete|incomplete_expired|canceled` use `forceFree` or no-op upgrade. Prefer agency/profile lookup over email `listUsers`.

---

## Claim 2 — `forceFree` uses unpaginated `listUsers()` (page 1 / default 50)

### Verdict: **VERIFIED**

| Piece | Result |
|-------|--------|
| `listUsers()` with no `page`/`perPage` | **VERIFIED** `billing-store.ts:123–126` |
| Auth-js default 50/page | **VERIFIED** `@supabase/auth-js` `GoTrueAdminApi.listUsers` docs: “Defaults to return 50 users per page” |
| Contrast: paginated elsewhere | **VERIFIED** `customer-health/scan.ts:40–52` |
| Used on cancel | **VERIFIED** `subscription.deleted` → `forceFree: true` → same non-`byAuthUserId` path |
| Silent miss + ACK 200 | **VERIFIED** — miss → `return`; lookup errors swallowed (`:127–129`); outer catch still `{ ok: true }` (`:727–731`) |

### Concrete triggers

1. Auth user not in first Admin API page (>50 users) → cancel never clears paid profile.  
2. Stripe customer email ≠ auth email (billing alias) → miss at **any** scale (works with current small PROD tenancy).  
3. Combined with claim 1: `unpaid` never needs `deleted`/`forceFree` to keep the paid profile.

### Blast radius

**MEDIUM** for current PROD scale if the only miss mode is “>50 users” (STATUS historically: few agencies, 0 `stripe_subscription_id` as of 2026-10-20). **MEDIUM–HIGH** for email-mismatch cancel miss + profile-gated features. Write path still limited via trialGrace when Stripe shows canceled/no live sub — same caveat as claim 1.

### Minimal fix

Stop using `listUsers` for entitlement writes: resolve via `agencies.stripe_customer_id` → profiles by `agency_id`, or Stripe metadata `authUserId`. If Admin API must stay: paginate like `scan.ts`. Fail closed (non-2xx) when `forceFree` cannot resolve a profile.

---

## Tracking / open PRs

| Item | Status |
|------|--------|
| Hunt report `docs/reports/2026-11-21-critical-bug-hunt-billing-credits-auth.md` | On branch `cursor/bc-d71cfa0e-…` only — **not on main** |
| Fix PR for these two exact bugs | **None open** (searched PR titles/bodies: `syncAccountTier`, `forceFree`, `listUsers` billing, `status-blind`) |
| Related but distinct open PRs | #946 (legacy seat checkout hardcodes `active`), #953 (v2 unpaid→canceled duplicate Checkout), #951 (incomplete/past_due leftover lockout) |
| Older note | 2026-08-15: `listUsers` no pagination filed as near-miss |

## Skeptical summary

Both code defects are real on `main` @ `0437f80d`. Triggers are on live webhook paths for **non-v2** subscriptions; v2 correctly status-gates and downgrades profiles. Claim 1’s `past_due` → agency-free wording is wrong. Calling either “CRITICAL full entitlement bypass” overstates blast radius while saas-ops write lockout still applies; profile-tier privilege elevation is real and worth a focused fix PR.
