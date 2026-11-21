# Critical bug hunt — billing / credits / auth (2026-11-21)

Head audited: `origin/main` @ `0437f80d`.
Scope: `apps/crm/src/lib/credits/**`, Stripe webhook fulfillment (`credits-billing*`, `billing-store`, `billing-lifecycle`), API routes for billing/credits/auth/team/profiles, writers of `account_tier` / `ui_role` / `credits_balance` / `subscription_status`, credit-mutation races.
Mode: **report-only** (no fix in this PR).

## Skipped (already tracked — open fix PRs)

| Bug | PR |
|-----|-----|
| expire_grant_credits TOCTOU | #960 |
| unpaid→canceled duplicate checkout | #953 |
| recommendations clear-then-insert | #952 |
| incomplete+past_due leftover lockout | #951 |
| multi-agency RLS wipe | #948 |
| applySeatCheckoutEntitlements without Stripe retrieve | #946 |
| incomplete_expired as live | #945 |
| type-blind clearRecommendations | #944 |
| licensing free entitlement server actions | #942 |
| saas-ops NO_AGENCY_FACTS lockout | #934 |
| pack_credits wipe unrecognized Price | #933 |
| listPersistedMatches soft-fail wipe | #930 |
| LIST_MAX truncation matching | #924 |
| outreach SYSTEM_USAGE_AGENCY_ID fallback | #923 |
| gmail markError/markPulled ciphertext | #911 / #902 |
| matching DELETE-then-INSERT silent wipe | #843 |
| expireGrantCredits absolute balance overwrite | #859 |
| acquire_dedup_keys global PK | #881 |

---

## NEW CRITICAL

### 1. Legacy `syncAccountTier` ignores subscription status → paid `profiles.account_tier` without payment / after unpaid

**Files**
- `apps/crm/src/lib/billing-store.ts` — `syncAccountTier` (~77–131), `handleStripeWebhookEvent` `customer.subscription.created` (~617–619) and `customer.subscription.updated` (~635–656)
- Contrast (correct): `apps/crm/src/lib/credits-billing-v2.ts` `REVOKED_SUBSCRIPTION_STATUSES` + `applyPricingV2SubscriptionEvent` / `loadLiveSubscriptionStatus`
- Consumer of the bad write: `apps/crm/src/lib/license/access.ts` `checkCapabilityAccess` → `resolveAccountTierFromProfile(profile.account_tier)`

**Root cause**
`syncAccountTier` maps Stripe **price ID → paid tier** and writes `profiles.account_tier` / `ui_role` with **no check of `subscription.status`**. Only `forceFree: true` (used solely on `customer.subscription.deleted`) downgrades.

v2 subscription events bypass this path when price IDs resolve as v2. **Legacy seat / starter / pro / enterprise** subscriptions still hit it.

Agency lifecycle (`syncAgencyBillingLifecycle`) correctly revokes `agencies.account_tier` on `unpaid` / `incomplete_expired` / `canceled`, but **does not touch profiles**. Profile entitlement is left to `syncAccountTier`.

**Trigger scenarios**

1. **Unpaid / failed collection (durable privilege)**  
   Paying legacy seat (or classic plan) customer enters Stripe `unpaid` (or `incomplete_expired`).  
   Webhook order on `customer.subscription.updated`:  
   - `syncAgencyBillingLifecycle` → agency `account_tier=free`, `subscription_status=unpaid`.  
   - `handleStripeWebhookEvent` → `syncAccountTier(customer, priceId)` **without forceFree** → profile restored/kept at paid tier from line-item price.  
   `unpaid` subscriptions are **not** deleted, so `forceFree` never runs. Profile stays paid while agency is free.

2. **Incomplete before payment (pre-pay privilege)**  
   User starts Checkout (`mode: subscription`, legacy seat/plan). Stripe emits `customer.subscription.created` with `status=incomplete` and paid price IDs (3DS / SEPA / abandon-after-sub-create).  
   Handler grants paid `account_tier` immediately. Seat fulfillment (`applySeatCheckoutEntitlements`) correctly waits for `payment_status=paid`, so **agency stays non-entitled while profile is already paid**.

**Impact**
- Auth / entitlement bypass: `checkCapabilityAccess` and other gates that trust `profiles.account_tier` unlock paid capabilities without a live paid subscription.
- Split-brain with agency row (free/unpaid) vs profile (paid) — trial/write lockout may still fire from Stripe status, but **capability / tier UI gates that read the profile remain elevated**.
- Distinct from #946 (seat checkout hardcodes agency `subscription_status: active`) and #953 (v2 unpaid rewritten to DB `canceled` → duplicate Checkout).

**Fix direction (not in this PR)**
- Gate `syncAccountTier` (or its callers) on live Stripe status ∈ `{active, trialing}` (and optionally `past_due` if product wants grace).  
- On `unpaid` / `incomplete` / `incomplete_expired` / `canceled`, call `forceFree` (or no-op upgrade).  
- Prefer resolving profile via `agencies.stripe_customer_id` / checkout `authUserId` metadata — see finding 2.

---

### 2. `syncAccountTier` customer→user resolve uses unpaginated `listUsers()` (default 50) → cancel downgrade silently missed

**Files**
- `apps/crm/src/lib/billing-store.ts` ~117–129 (`supabase.auth.admin.listUsers()` with no `page` / `perPage`)
- Same path used for **all** non-`byAuthUserId` syncs, including `customer.subscription.deleted` → `forceFree: true`
- Contrast: `apps/crm/src/lib/customer-health/scan.ts` correctly pages `listUsers({ page, perPage })`
- Auth-js default: **50 users per page** (`GoTrueAdminApi.listUsers`)

**Root cause**
When webhook has only `stripe_customer_id` (subscription lifecycle events), `syncAccountTier` retrieves the Stripe customer email and does `listUsers().users.find(email)`. First page only. Miss → silent return; errors inside the lookup are swallowed. Webhook still ACKs 200 (`handleStripeWebhookEvent` catch only logs).

**Trigger scenarios**

1. Auth user is not among the first 50 users returned by Admin API → `subscription.deleted` never clears their paid `account_tier`.  
2. Stripe customer email ≠ auth email (billing alias) → same silent miss.  
3. Combined with finding 1: even when delete never helps, `updated` with `unpaid` actively **re-applies** paid tier from price.

**Impact**
Permanent paid profile entitlement after cancel/delete when lookup misses — privilege retention / billing bypass. Previously noted as “near-miss” (2026-08-15) without a forceFree-on-cancel trigger; with profile-gated capabilities it clears the confidence bar.

**Fix direction**
- Stop using `listUsers` for entitlement writes: store `auth_user_id` / profile id on Stripe customer or agency; or look up `profiles` by email with a bounded DB query.  
- If Admin API must be used: paginate like `customer-health/scan.ts`.  
- Fail closed on deleted/unpaid: non-2xx so Stripe retries when profile cannot be resolved.

---

## Cleared this pass (no NEW critical above bar)

| Area | Note |
|------|------|
| Atomic credit RPCs (`apply_credit_purchase`, `apply_monthly_grant_credits`, `spend_credits`) | FOR UPDATE + idempotency; no new wipe beyond #859 repair / #960 TOCTOU |
| Pricing v2 plan fulfill | Live Stripe retrieve + revoked-status refuse; first grant idempotent |
| Pricing v2 credits fulfill | Session-id idempotency; amount from server-written metadata (line-item qty matches at create) |
| Seat/top-up/starter webhook | `isSessionPaid` + fail-closed 500 on fulfill failure (post-#925) |
| `redeem-code` | Agency from session profile; claim-then-grant |
| profiles PATCH / team users | Owner gates + role allowlists (post-#939/#935) |
| `l99-licensing.upgradeToL99` | Disabled throw |
| `licensing.ts` free writers | Already #942 |
| agencies / profiles column guards | service_role-only for billing columns |
| Monthly cycle | Single `credits-cycle` cron; expire+grant order documented |
| saas-ops / hasLiveSubscription / pack wipe / seat active hardcode | Already #934/#951/#945/#933/#946 |

## Latent / below CRITICAL bar (not filed)

- `monthly-cycle` `AGENCY_GRANT_COLUMNS` omits `licensed_users` → falls back to `pricing_band` (under/over-grant if band stale; needs band null/drift).
- `fulfillPricingV2CreditsCheckout` trusts metadata credits vs re-reading Stripe line items (server-created sessions only).
- Deprecated `/api/cron/credits-expire` + `credits-grant` still callable with `CRON_SECRET` (not in `vercel.json`).

## Evidence

- Code paths on `0437f80d` as cited above.  
- No production Stripe event replay in this run (read-only hunt).  
- Open fix PRs #843–#960 left untouched.

## Next task (GO gate)

**GO?** Open fix PR: status-gate + reliable profile resolve for `syncAccountTier` (findings 1–2), with vitest covering `created/incomplete`, `updated/unpaid`, and `deleted` when user is outside first `listUsers` page — **without** bundling unrelated tracked billing fixes.
