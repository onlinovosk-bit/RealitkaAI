# Critical hunt — billing / trial / credits (2026-10-16)

**Head:** `80eb86b1` (`main`)  
**Branch:** `cursor/recent-commit-bug-inspection-a6e4`  
**Scope:** `#854` trial (`4417cf6b`), `#846` secdef, grant-engine (except `#859` repair CAS), Stripe subscription lifecycle, `saas-ops` `trialGraceFrom` / `paysOutsideStripe`, `feature-gating`.  
**Excluded (do not re-open):** matching wipe `#843`, pricing-v2 stale webhook `#845`, expire repair CAS `#859`.  
**Method:** read call chains + diffs; vitest proof for new `#854` / grant findings; Kontrolór (FAKT only).  
**Action:** report only — **no fix**.

## Verdict

**3 CRITICAL findings** still (or newly) on `main`. One is **new** from `#854` (`paysOutsideStripe` + `past_due`). One is a still-open send-gate gap (prior hunt). One is legacy grant after Stripe cancel.

---

## FINDING-1 (NEW, `#854`) — `past_due` counts as `paysOutsideStripe` when Stripe sub is invisible

**Severity:** wrong unfreeze / free full write while delinquent  
**Paths:** `apps/crm/src/lib/saas-ops.ts:271-278`, `360-384`; billing lookup `apps/crm/src/lib/billing-store.ts` (customer by **current user** email)

### Evidence

`ENDED_SUBSCRIPTION_STATES` = `canceled | unpaid | incomplete_expired` — **`past_due` is absent**:

```271:278:apps/crm/src/lib/saas-ops.ts
const ENDED_SUBSCRIPTION_STATES = new Set(["canceled", "unpaid", "incomplete_expired"]);

export function agencyPaysOutsideStripe(row: AgencyBillingRow): boolean {
  if (ENDED_SUBSCRIPTION_STATES.has((row.subscription_status ?? "").trim().toLowerCase())) {
    return false;
  }
  return isPayingAgency(row);
}
```

`isPayingAgency` still returns true for leftover non-free `plan` / `account_tier` when status is `past_due`.  
`trialGraceFrom` then, with `hasSubscription: false`, short-circuits to **`active`** (full write).

Vitest proof (run 2026-10-16, then deleted):  
- `agencyPaysOutsideStripe({ plan:"Pro", account_tier:"pro", subscription_status:"past_due" }) === true`  
- same facts + `hasSubscription:false` → `state === "active"`, `accessLevelFrom === "full"`  
- same facts + live Stripe `past_due` past grace → `blocked` / `read_only` (owner path)

### Trigger

1. Stripe subscription enters `past_due`; webhook stores `subscription_status=past_due` and keeps paid `plan` / `account_tier` (lifecycle deliberately does not revoke on `past_due`).
2. Session user has **no** Stripe customer (team member email ≠ billing email, or owner changed email).
3. `getCurrentBillingStatus` → `hasSubscription: false`.
4. `paysOutsideStripe === true` → gate returns **`active`**.
5. Same agency, billing owner with matching Stripe email → grace/blocked.

### Impact

Delinquent (or grace-eligible) agency keeps **full write** for any session that cannot see the Stripe subscription — opposite of the founder trial/paywall intent in `#854`.

### Not the same as `#845`

`#845` is stale **event payload** overwrite on v2 subscription webhooks. This is **access gate** using DB `past_due` as “invoice outside Stripe”.

---

## FINDING-2 (still open; also reported same day) — ghostwriter / confirm-viewing bypass trial write gate

**Severity:** free send after trial / canceled (paywall bypass)  
**Also in:** `docs/reports/2026-10-16-trial-gate-send-route-bypass.md` (commit `5aef6903` on this branch) — re-confirmed, not a second bug.  
**Paths:**  
- `apps/crm/src/app/api/ghostwriter/send-email/route.ts` — auth + rate-limit + `authorizeSend`, **no** `requireActiveAppAccess` / `requireFeature`  
- `apps/crm/src/app/api/playbook/confirm-viewing/route.ts` — same  
- Contrast: `apps/crm/src/app/api/outreach/send/route.ts:30` → `requireFeature("outreach")` → `requireActiveAppAccess()`

`rg requireActiveAppAccess|requireFeature` under `api/ghostwriter` and `api/playbook/confirm-viewing` → **no matches** (re-verified 2026-10-16).

### Trigger

1. Trial ends / plan canceled → `canUseFullApp = false`.
2. `POST /api/outreach/send` blocked.
3. Same session `POST /api/ghostwriter/send-email` or `POST /api/playbook/confirm-viewing` still sends (kill switch off).

Noted as out-of-scope in `#859`; **no fix PR**. Made more valuable after `#854` closed the `canUseFullApp` / `trialGraceFrom` path for gated routes.

---

## FINDING-3 — legacy monthly grant after Stripe cancel (seats not cleared)

**Severity:** free credit mint after cancel (legacy / seat path)  
**Paths:** `apps/crm/src/lib/billing-lifecycle.ts:161-164` (revoke sets `account_tier=free`, does **not** zero `seats`); `apps/crm/src/lib/credits/grant-engine.ts:62-77` (legacy ignores `subscription_status`); `apps/crm/src/lib/credits/monthly-cycle.ts:94-97` (select `.gt("seats", 0)`)

### Evidence

Vitest proof: row `{ pricing_model: null, subscription_status: "canceled", account_tier: "free", seats: 10 }` → `monthlyGrantAmountForAgency` = solo×10 > 0.

v2 path correctly returns 0 unless `subscription_status === "active"` (`grant-engine.ts:65`). Cancel on v2 sets `subscription_status: "canceled"` (`credits-billing-v2.ts:597-602`) → no grant. **Legacy asymmetry.**

### Trigger

1. Seat/legacy agency ( `pricing_model` null ) cancels Stripe subscription.
2. `syncAgencyBillingLifecycle` revokes → `subscription_status=canceled`, `account_tier=free`, **`seats` unchanged**.
3. Monthly credits-cycle still selects the agency (`seats > 0`) and grants solo×seats every period.

### Impact

Canceled non-v2 agencies keep receiving free grant credits. Not `#859` (repair absolute write / CAS).

---

## Checked — no new CRITICAL

| Area | Result |
|---|---|
| `#845` stale v2 webhook payload | Excluded; still open |
| `#859` expire repair CAS | Excluded; still open |
| `#846` secdef callers → `createAdminClient` | Code routes session/`cron` profileIds; SQL balík D **unapplied**. Residual anon EXECUTE on those RPCs is pre-existing until `GO D-APPLY`, not a new misuse in the TS change. `createAdminClient` still lacks `SUPABASE_SECRET_KEY` fallback (unlike `createServiceRoleClient`) — latent ops footgun, not filed CRITICAL here |
| `trialGraceFrom` self-serve + `trial_ends_at` | Agency clock wins; invite refresh fixed when `trial_ends_at` set |
| `lookupFailed` / `unknown` fail-open | Intentional; paying customers not locked on Stripe outage |
| `canceled` / `unpaid` via `paysOutsideStripe` | Correctly excluded from ENDED set path |
| Happy-path `expire_grant_credits` FOR UPDATE | OK; only repair branch is `#859` |
| Feature flags DEV all-true | Monetization debt behind `canUseFullApp`; not a third freeze bug |

---

## Kontrolór

| Claim | Label | Verdict |
|---|---|---|
| `past_due` → `paysOutsideStripe` + invisible Stripe → `active` | FAKT (source + vitest) | CRITICAL FINDING-1 |
| Ghostwriter / confirm-viewing ungated | FAKT (`rg` + contrast) | CRITICAL FINDING-2 |
| Legacy cancel still grants solo×seats | FAKT (lifecycle + grant-engine + vitest) | CRITICAL FINDING-3 |
| `#846` introduces auth bypass today | PREDPOKLAD (needs D-APPLY + missing SERVICE_ROLE) | Not CRITICAL now |

---

## Next (GO gate — no autonomous fix)

1. **GO fix FINDING-1** — one PR: treat Stripe-linked delinquent DB statuses (`past_due`, and any status that is not “invoice-only”) as **not** `paysOutsideStripe`; or require `manual_plan` / explicit invoice flag instead of leftover `plan`/`account_tier`.  
2. Or **GO fix FINDING-2** — attach `requireFeature("outreach")` / `requireActiveAppAccess` on both send routes + tests.  
3. Or **GO fix FINDING-3** — on lifecycle revoke zero `seats` **or** skip legacy grant when `subscription_status` ∈ revoked set.  
4. Keep `#843` / `#845` / `#859` as separate 1-PR merges.
