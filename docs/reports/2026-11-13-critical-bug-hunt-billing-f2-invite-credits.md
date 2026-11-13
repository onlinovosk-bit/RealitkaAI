# Critical bug hunt — billing / F2 / invite / credits (2026-11-13)

**Head audited:** `origin/main` @ `c0ed01e9`  
**Branch:** `cursor/critical-bug-hunt-billing-f2-2026-11-13`  
**Scope:** HIGH-SEVERITY only (data loss, crash, auth/permission bypass, tenant lockout, silent wipe, cross-tenant leak). Adversarial full call-chain reads — not diff-only.

## Already tracked — not re-reported

| Item | PR |
|------|-----|
| billing incomplete/past_due leftover lockout | #951 |
| matching multi-agency RLS wipe | #948 |
| credits-billing applySeatCheckoutEntitlements hardcodes active | #946 |
| credits-billing-v2 hasLiveSubscription incomplete_expired | #945 |
| recommendations type-blind clear | #944 |
| licensing free entitlement server actions | #942 |
| saas-ops loadAgencyBillingFacts error lockout | #934 |
| credits-billing-v2 pack wipe on unrecognized price | #933 |
| recommendations soft-fail listPersistedMatches | #930 |
| matching LIST_MAX truncation | #924 |
| outreach fetchLeadAgencyId SYSTEM_USAGE fallback | #923 |
| gmail markError/markPulled ciphertext | #911, #902 |
| matching DELETE-then-INSERT wipe | #843 |
| grant-engine expireGrantCredits CAS | #859 |
| acquire_dedup_keys global PK | #881 |

Yesterday cleared (not re-opened): deliverability F-01/F2 signature, starter-pack HMAC, auth #941/#939/#935, SEO #950, model-gateway (no CRM callers on main).

## Verdict: NONE

No **new** CRITICAL finding beyond the open tracked PRs above.

## Areas investigated (call chains)

### 1. `credits-billing*` + Stripe webhook fulfill

- `apps/crm/src/lib/credits-billing.ts` — seat/top-up checkout; `applySeatCheckoutEntitlements` still hardcodes `subscription_status: "active"` at L212 (**#946**).
- `apps/crm/src/lib/credits-billing-webhook.ts` — paid gate (`isSessionPaid`), fail-closed missing `agencyId`, grant fail-closed; starter_pack waits for paid.
- `apps/crm/src/lib/credits-billing-v2.ts` — live Stripe retrieve before plan fulfill; revoke on canceled/unpaid/incomplete_expired; `hasLiveSubscription` second clause still treats non-terminal leftovers with `stripe_subscription_id` as live (**#945** for `incomplete_expired`).
- `apps/crm/src/app/api/billing/webhook/route.ts` — pricing fulfill must succeed before ACK; lifecycle + legacy `handleStripeWebhookEvent` after.
- Pack wipe on unrecognized price still **#933** (`readPricingV2SubscriptionItems` → `packCredits = 0` when seat resolves).

No additional lockout/restore/wipe path that meets CRITICAL beyond those PRs.

### 2. `saas-ops.ts` + `billing-store.ts`

- `pickRelevantStripeSubscription` still includes `incomplete` / `past_due` / `unpaid` on main — leftover lockout for invoice tenants is **#951** (open PR drops `incomplete` + honors `paysOutsideStripe` on past_due/unpaid/canceled).
- `loadAgencyBillingFacts` error → `NO_AGENCY_FACTS` (`paysOutsideStripe: false`) is **#934**.
- `agencyPaysOutsideStripe` short-circuits ended DB statuses before `isPayingAgency` unless `manual_plan` is set — intentional; #951 assumes `manual_plan` invoice tenants.

No new trialGrace / paysOutsideStripe CRITICAL beyond #951/#934.

### 3. Public form capture / API key (F2)

- `POST /api/demo/public-capture` — Zod + honeypot + rate limit; injects server `DEMO_CAPTURE_API_KEY` into in-process `capture-lead` (no browser key). Writes `leads_demo` only.
- `POST /api/demo/capture-lead` — timing-safe API key; 503 if unset.
- `POST /api/leads/inbound` — slug+token via `resolveInboundAgency` (timing-safe); service-role insert scoped to resolved agency.
- `POST /api/valuation/submit` — tenant slug resolve; sandbox vs live rate keys.
- `POST /api/acquire/email` — shared secret fail-closed (503 if unset).
- Buyer onboarding — fixed Smolko agency env; no client-supplied agency.

No auth bypass at CRITICAL bar (F2 public-capture hardening remains as previously cleared).

### 4. Team invite / profiles create

- `/api/invite` — owner/founder gate; `INVITABLE_ROLES`; refuses cross-agency email move; fail-closed profile upsert.
- `/api/team/users` — owner/founder; `CREATABLE_ROLES`; agency from caller only (merged #935 class).
- `/api/profiles/[id]` — `ASSIGNABLE_ROLES` + self-PK guard (merged #941 class).
- `/api/onboarding/role` — refuses self-service role write.
- `apps/crm/src/app/_actions/licensing.ts` — still live free entitlement writers on main → **#942** (do not re-file).

No new privilege escalation beyond #942/#935/#939/#941.

### 5. Credit redemption / starter pack download

- Download: HMAC verify + production secret fail-closed + DB purchase row check (`/api/starter-pack/download`).
- Redeem: claim-first then `applyCreditPurchase` idempotent; agency from session profile only.
- Fulfill: paid session gate; idempotent by `stripe_session_id`.

No CRITICAL cross-tenant unpaid grant path beyond notes below.

## Medium / low (do not inflate)

1. **`POST /api/billing/redeem-code` has no rate limit** while codes are `REV-47-` + 6 chars from 32-symbol alphabet (`code-generator.ts` ≈ 1.07e9 space). Online guessing of sparse paid-but-unredeemed codes is theoretically possible for an authenticated agency; practical cost scales with issued-code density. Not filed CRITICAL (sparse space; needs auth; €47 credits). Hardening: rate limit per agency/IP + longer suffix.
2. **`getFeatureFlagsForPlan` still has DEV OVERRIDE** (`saas-ops.ts` ~L145–158) — all plan feature flags always true. Write gate still uses `accessLevel` / `canUseFullApp` where `requireFeature` is called; plan differentiation is dead. Medium product/gate debt, not lockout/bypass of the trialGrace path itself.
3. **Legacy `monthlyGrantAmountForAgency`** ignores `subscription_status` (`grant-engine.ts` L75–92). Canceled legacy agencies can still receive monthly grant cron credits. Financial leakage / unpaid grant — medium, not tenant lockout.
4. **`hasLiveSubscription` + `paused`**: Stripe `paused` is not in `LIVE_SUBSCRIPTION_STATUSES` but passes the `stripe_subscription_id` second clause (same class as pre-#945 fail-closed for unknowns). Checkout may block until portal unpause; intentional “prefer block over second sub” per #945 direction — not a new CRITICAL.
5. **Public-capture `rateLimit` fail-open** when service role/RPC missing — known; spam to `leads_demo` only.

## Evidence (this turn)

- Read full sources listed above at `c0ed01e9`.
- Cross-checked open PR titles/bodies via `gh pr list` / `gh pr view` / `gh pr diff` for #951, #945, #946, #934, #942.
- Did not re-open yesterday’s cleared auth/HMAC/F2 signature items.

## Next

- Prefer merging tracked billing lockout PRs (#951, #945, #946, #934) before new hunt surface.
- Optional follow-up (separate PR, not CRITICAL): redeem-code rate limit + longer code entropy.
