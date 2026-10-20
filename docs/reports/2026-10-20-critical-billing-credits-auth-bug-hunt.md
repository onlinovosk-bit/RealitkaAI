# Critical bug hunt — billing / credits / auth (2026-10-20)

**Head:** `5c6956cb` (`cursor/critical-bug-detection-267c`)  
**Scope:** CRITICAL only — data loss, unpaid access, missed credits with no retry, auth/access-gate bypass  
**Method:** code review of live paths (no PROD mutation)  
**Skipped (tracked open / merged as named):** matching-store wipe (#843, #883), grant expire CAS (#859), past_due paysOutsideStripe (#877), acquire_dedup (#881), monthly grant soft-skip (merged #887)

---

## Verdict

**4 CRITICAL findings still live in tree** (prior 2026-10-18 / 2026-08-25 flags not fixed).  
**No additional NEW CRITICAL** beyond these four and the skipped tracked PRs.

`#887` hard-fail for monthly cron is **verified fixed** in `grant-engine.ts` + `monthly-cycle.ts` (RPC hard fail → `error` → cycle `ok: false`). That does **not** fix seat-webhook grant swallow.

---

## 1. CRITICAL — Seat webhook ACKs after entitlements even if initial grant fails

| | |
|---|---|
| **Paths** | `apps/crm/src/lib/credits-billing-webhook.ts` (`handlePricingCheckoutWebhook` seat branch); `apps/crm/src/lib/credits-billing.ts` (`triggerInitialGrantAfterSeatCheckout`); contrast: `apps/crm/src/lib/credits-billing-v2.ts` (`applyFirstPricingV2Grant` fail-closed) |
| **Root cause** | After `applySeatCheckoutEntitlements` returns `true`, webhook `await`s `triggerInitialGrantAfterSeatCheckout` and **ignores** its result, then `return ok`. Route ACKs 200 → Stripe stops retrying. Wrapper also drops hard failures to `{ skipped: true }` when service role is missing (no `error` field). |
| **Trigger** | 1) Client pays legacy `checkoutType=seat` (API still creates seat sessions even when `PRICING_V2_ENABLED=true` — test: „legacy bodies still use the legacy path"). 2) Entitlements UPDATE succeeds. 3) `apply_monthly_grant_credits` / service role fails transiently. 4) Webhook returns 200. |
| **Impact** | Paid seats active; **0 grant credits**; no Stripe retry. Cron may help on next 1st only — mid-month buyers stay creditless until then (or forever if amount≤0 / soft skip). |
| **Evidence (FAKT)** | |

```65:68:apps/crm/src/lib/credits-billing-webhook.ts
    if (ok) {
      await triggerInitialGrantAfterSeatCheckout(agencyId);
    }
    return ok;
```

v2 plan path correctly returns `false` on grant hard fail so route returns 500.

**Not fixed by #887** — that only fails the monthly cron cycle.

---

## 2. CRITICAL — Legacy seat / credit_topup / starter_pack fulfill without `isSessionPaid`; async ignored

| | |
|---|---|
| **Paths** | `apps/crm/src/lib/credits-billing-webhook.ts` (seat / `credit_topup` / `starter_pack`); `apps/crm/src/app/api/billing/webhook/route.ts` (`isPricingCheckoutSession` only treats async for v2); `apps/crm/src/lib/credits-billing-v2.ts` (`isSessionPaid` — v2 only) |
| **Root cause** | v2 gates on `payment_status === paid \| no_payment_required` and fulfills on `checkout.session.async_payment_succeeded`. Legacy branches run on `completed` with **no** payment check. For `isAsyncPaid`, non-v2 returns `false` early; route does **not** 500 for legacy async (explicit test: „keeps today's behaviour"). |
| **Trigger A — unpaid access** | Customer pays with async method (e.g. SEPA). Stripe sends `checkout.session.completed` with `payment_status=unpaid`. Legacy seat → seats + `subscription_status=active` without money. Legacy top-up → `applyTopupPurchase` credits. Starter pack → redemption code issued. |
| **Trigger B — missed fulfill** | If product ever relied on async-only fulfillment for legacy metadata, `async_payment_succeeded` is ignored → paid session never fulfilled (no 500 retry loop for that event type on legacy). |
| **Impact** | Unpaid access and/or free credits/codes; or permanent miss if only async fires. |
| **Evidence (FAKT)** | Tests encode the gap: `credits-billing-v2.test.ts` „async_payment_succeeded … ignored for legacy"; `webhook/__tests__/route.test.ts` „legacy type … not guarded". |

---

## 3. CRITICAL — `loadAgencyBillingFacts` error → `NO_AGENCY_FACTS` (`paysOutsideStripe: false`) → invoice payers limited

| | |
|---|---|
| **Paths** | `apps/crm/src/lib/saas-ops.ts` (`loadAgencyBillingFacts`, `NO_AGENCY_FACTS`, `trialGraceFrom`) |
| **Root cause** | On Supabase `error` or `catch`, returns `{ trialEndsAt: null, paysOutsideStripe: false }`. Invoice / `manual_plan` agencies have **no** Stripe subscription. With `paysOutsideStripe: false` and trial elapsed, `trialGraceFrom` returns `limited` → `canUseFullApp=false` for gated routes. |
| **Trigger** | Agency with `manual_plan` set, no `stripe_subscription_id`, trial over. Transient RLS/PostgREST error (or missing column) while loading agency billing row during `getSaasOpsSnapshot` / `requireFeature`. |
| **Impact** | Paying invoice customer incorrectly forced into read-only / blocked features (opposite of Stripe `lookupFailed` fail-open). |
| **Distinct from #877** | #877 = `past_due` leftover `plan` still counted as paying outside Stripe. This bug = **load failure defaults to not paying**. Do not collapse into #877. |
| **Evidence (FAKT)** | |

```264:298:apps/crm/src/lib/saas-ops.ts
const NO_AGENCY_FACTS: AgencyBillingFacts = { trialEndsAt: null, paysOutsideStripe: false };
...
    if (error) return NO_AGENCY_FACTS;
...
  } catch {
    return NO_AGENCY_FACTS;
  }
```

Regression guard in `trial-no-card.test.ts`: same inputs with `paysOutsideStripe: false` → `read_only`.

---

## 4. CRITICAL — Ghostwriter send-email / confirm-viewing skip `requireActiveAppAccess` (paywall bypass)

| | |
|---|---|
| **Paths** | `apps/crm/src/app/api/ghostwriter/send-email/route.ts`; `apps/crm/src/app/api/playbook/confirm-viewing/route.ts`; gate: `apps/crm/src/lib/feature-gating.ts` (`requireActiveAppAccess` / `requireFeature`) |
| **Root cause** | After #817, `canUseFullApp` is real. Only ~8 API routes call `requireFeature` (outreach, integrations, scoring, team assign). Ghostwriter send and confirm-viewing only check logged-in user (+ `authorizeSend` kill switch) — **not** trial/subscription access. Same class: `POST /api/leads` creates leads with auth only. |
| **Trigger** | User auth OK; agency trial expired / subscription `limited` or `blocked` (`canUseFullApp=false`). Call `POST /api/ghostwriter/send-email` or `POST /api/playbook/confirm-viewing` (or `POST /api/leads`). |
| **Impact** | Unpaid / post-trial account still sends irreversible external email/SMS and mutates CRM — paywall / read-only promise bypassed. |
| **Evidence (FAKT)** | `rg requireFeature` under `app/api` → outreach/integrations/scoring/team only. Ghostwriter/confirm-viewing: no `feature-gating` import. |

---

## Explicitly not CRITICAL / already handled

| Item | Status |
|---|---|
| Monthly grant soft-skip → cron 200 | **Fixed** #887 (`error` + `grant_failed:N`) |
| Grant expire repair stale purchased overwrite | Tracked #859 — skipped |
| past_due → paysOutsideStripe | Tracked #877 — skipped |
| Matching wipe / acquire dedup | Tracked #843/#883/#881 — skipped |
| Empty `agencyId` on checkout create | **Fixed** (`requireCheckoutAgencyId`) |
| Ledger orphan RMW on monthly grant | **Mitigated** by atomic `apply_monthly_grant_credits` RPC (webhook swallow in #1 remains) |

---

## Recommended fix order (for founder GO — not executed here)

1. Seat webhook: `return ok && grantSucceeded` (propagate `error`; mirror v2).  
2. Legacy + starter_pack: share `isSessionPaid`; handle `async_payment_succeeded` like v2; 500 on failed fulfill.  
3. `loadAgencyBillingFacts`: on error → fail-open `unknown` / preserve last-known paying, never `paysOutsideStripe: false` as silent default.  
4. Wire `requireActiveAppAccess` (or shared helper) on ghostwriter send, confirm-viewing, and other write APIs that mutate/send.

---

## Kontrolór (short)

| Claim | Tag | Verdict |
|---|---|---|
| #1–#4 present at `5c6956cb` | FAKT (cited lines + tests) | PASS as findings |
| #887 closed monthly soft-skip | FAKT (code + report) | PASS |
| Prod volume of SEPA/legacy seat | NEZNÁME | FLAG — bugs are reachable in code; traffic share unverified |
| No open PR already fixing #1–#4 | FAKT (`gh pr list` search) | PASS |

---

## Next GO (task-loop)

**GO FIX-SEAT-WEBHOOK-GRANT** — one PR: fail-closed seat grant + `isSessionPaid` for legacy seat/topup (items 1–2). Items 3–4 separate PRs.
