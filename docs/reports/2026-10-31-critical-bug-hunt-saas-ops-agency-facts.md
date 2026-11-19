# Critical bug hunt — 2026-10-31

Head: `origin/main` @ `2336af52` (+ fix on this branch).
Scope: credits/billing, matching/recommendations siblings, starter-pack, unsubscribe/resend, proxy, cost-governor, saas-ops trial/past_due.

## NEW CRITICAL

### `loadAgencyBillingFacts` DB/RLS error → false `paysOutsideStripe=false` → read-only lockout

- **File:** `apps/crm/src/lib/saas-ops.ts` (`loadAgencyBillingFacts`, `getTrialGraceState`, `getSaasOpsSnapshot`)
- **Trigger:** Invoice / `manual_plan` agency (no Stripe customer on session). User past trial. Transient `agencies` select error, throw, or RLS failure while loading billing facts.
- **Impact:** `NO_AGENCY_FACTS` was treated as “not paying outside Stripe”. `trialGraceFrom` → `limited` → `requireActiveAppAccess` throws → write APIs locked. Stripe lookup failure already fail-opens to `unknown`/`full`; agencies read failure did the opposite. PROD note in-source (2026-10-15): 7/7 agencies lack `stripe_subscription_id` — blast is every invoice-style tenant.
- **Why not tracked:** Not in open PRs #933/#930/#925/#924/#923/#911/#902/#843/#859/#881. Surfaced in an earlier hunt memory (2026-10-18) but never landed a fix PR; later hunts treated saas-ops as “#877 residual” only.
- **Minimal fix (this PR):** On agencies read error/exception return `AGENCY_FACTS_UNAVAILABLE` (`lookupFailed: true`). `getTrialGraceState` ORs `agency.lookupFailed` into the same `unknown` path as Stripe `lookupFailed`. Missing agency row / missing `agency_id` still uses `NO_AGENCY_FACTS` (real non-paying).

## Skipped (still open, not re-reported)

#933 pack_credits wipe · #930 recommendations soft-fail wipe · #925 starter unpaid + async ACK · #924 matching LIST_MAX · #923 outreach agency fallback · #911/#902 gmail races · #843 matching delete-then-insert · #859 expireGrantCredits CAS · #881 acquire_dedup global PK

## Near-misses (below bar)

1. **`runAImatching` → `recalculateAllMatches()` without scoped client** — cron uses browser singleton, no session → empty lead/property reads. Empty-guard skips delete (no wipe); feature is a silent no-op, not data loss.
2. **`applySeatCheckoutEntitlements` hardcodes `subscription_status: "active"`** without live Stripe retrieve (unlike v2). Concrete unpaid path already gated by `isSessionPaid`; remaining risk is rare webhook replay after cancel — weaker than #925 / not proven in prod path.
3. **cost-governor multi-process ledger lost-update** — already documented; internal BUS spend ceiling, not tenant CRM data/billing entitlements.

## Verification

```bash
cd apps/crm && npx vitest run src/lib/__tests__/trial-no-card.test.ts src/lib/__tests__/trial-gate-closed.test.ts
```
