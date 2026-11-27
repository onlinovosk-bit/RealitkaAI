# Critical bug hunt — billing/credits (2026-11-27)

Head audited: `origin/main` @ `0437f80d`. Report-only (no code change).

## NEW CRITICAL

### Legacy seat Checkout has no live-subscription lock → second paid sub orphans the first

**Files / lines (main @ 0437f80d):**

- `apps/crm/src/lib/credits-billing.ts:114–147` — `createSeatCheckoutSession` never reads `agencies.subscription_status` / `stripe_subscription_id`; always opens a new Stripe Checkout `mode: "subscription"`.
- `apps/crm/src/lib/credits-billing.ts:207–222` — `applySeatCheckoutEntitlements` overwrites `stripe_subscription_id` (and hardcodes `subscription_status: "active"`) with the **new** session’s subscription id.
- Contrast: `apps/crm/src/lib/credits-billing-v2.ts:323–328` — v2 plan Checkout returns `subscription_exists` when `hasLivePricingV2Subscription` is true.

**Trigger scenario:**

1. Agency already has a live legacy seat subscription (`stripe_subscription_id = sub_old`, status active / past_due / unpaid / incomplete).
2. Authenticated member calls `POST /api/billing/credits/checkout` with `{ checkoutType: "seat", … }` (UI “buy seats again”, scripted retry, or upgrade mistaken for a new Checkout).
3. Stripe creates **sub_new** (and, with still-open #967 `customer_email`, often a new Customer too).
4. Webhook `checkout.session.completed` (paid) → `applySeatCheckoutEntitlements` points the agency at `sub_new`.
5. `syncAgencyBillingLifecycle` for later events on `sub_old`: lookup by subscription id misses; customer fallback hits `other_subscription` because stored id is `sub_new` → **old sub keeps invoicing with no CRM revoke path**.

**Impact:** double Stripe billing; orphaned paid subscription invisible to portal/lifecycle; agency pointer and grants follow only `sub_new`. Not fixed by #967 (customer reuse) — same Customer can still hold two seat subscriptions. Distinct from #953 (v2 unpaid rewritten to `canceled` clearing the v2 lock) and #946 (stale seat fulfill hardcodes `active` without live retrieve).

**Fix direction (not in this report):** mirror v2 — refuse seat plan Checkout when agency has a live Stripe subscription id/status; seat changes via Billing Portal (or explicit cancel-then-checkout). Optionally refuse overwrite of `stripe_subscription_id` when a different live id is already stored.

## Checked — no new high-confidence CRITICAL beyond the above

| Area | Result |
|---|---|
| `credits-billing-v2` fulfill | Live retrieve + `isSessionPaid`; revoked statuses ignored; first grant idempotent with cron key |
| `credits-billing-webhook` | Seat/top-up/starter/`pricing_v2*` gated on paid / async success |
| `billing-store` `syncAccountTier` | Unpaid/`incomplete` elevation + checkout `payment_status` → **#962** (open PR already adds both gates; not re-reported) |
| `billing-lifecycle` | Revokes canceled/unpaid/`incomplete_expired`; `other_subscription` guard; seat restore on non-revoking statuses |
| `grant-engine` / `mutate-credits` / SQL RPCs | Atomic FOR UPDATE writers; expire repair / TOCTOU remain **#859 / #960** |
| `monthly-cycle` | Selects v2 columns; scheduled path is `credits-cycle` only |
| `saas-ops` | `NO_AGENCY_FACTS` / past_due manual_plan → **#934 / #951** |
| Pack wipe / free leftover seats / quantity profile | **#933 / #966 / #965** |
| Redeem / starter-pack | Claim-then-grant; session agency from profile |
| Deprecated `GET /api/cron/credits-grant` | Selects **without** `pricing_model`/`subscription_status` → would mis-grant v2 as legacy if invoked; **not scheduled** in `vercel.json` (manual-only) — noted, not raised as CRITICAL without an active trigger |

## Skipped tracked (exact bugs)

#967 #966 #965 #962 #960 #953 #951 #946 #945 #934 #933 #859
