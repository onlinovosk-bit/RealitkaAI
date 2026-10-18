# Critical recheck — grant-engine + matching-store vs #859 / #843

**Date:** 2026-10-18  
**Head:** `626748f0` (`main`)  
**Scope:** `apps/crm/src/lib/credits/grant-engine.ts` (full) + `matching-store.ts` recalculate paths  
**Baseline (skipped as already fixed in open PRs):**

| PR | Bug |
|----|-----|
| [#859](https://github.com/onlinovosk-bit/RealitkaAI/pull/859) | Expire repair writes `credits_balance` from cron snapshot → concurrent top-up wipe |
| [#843](https://github.com/onlinovosk-bit/RealitkaAI/pull/843) | DELETE-then-INSERT; insert/timeout after delete → `inserted:0` wipe |

## New CRITICAL

### 1. `recalculateMatchesForLead` wipes on false-empty `listProperties` (survives #843)

**Paths:** `matching-store.ts` `recalculateMatchesForLead` vs early-return guards on property/all paths; `properties-store.ts` prod soft-fail → `[]`.

**Asymmetry (FAKT):**

- `recalculateMatchesForProperty`: `if (leads.length === 0) return` — no delete (“empty read is not evidence”).
- `recalculateAllMatches`: `if (leads.length === 0 \|\| properties.length === 0) return` — no delete.
- `recalculateMatchesForLead`: **no** `properties.length === 0` guard → computes 0 matches → **DELETE all rows for that lead** → `inserted: 0`.

`listProperties` in production returns `[]` on query error / missing client / missing `agency_id` (not a thrown error).

**Trigger:**

1. Lead `L` has persisted matches.
2. Lead save / `POST` matching recalculate → `autoRecalculateForLead(L)` / `recalculateMatchesForLead(L)`.
3. `getLead(L)` OK; `listProperties` soft-fails → `[]` (e.g. PostgREST error in prod).
4. All `lead_property_matches` for `L` deleted; HTTP/activity reports success with 0 inserts.

**#843:** upsert-then-orphan still calls delete-scope when `keep.length === 0` — same wipe on false-empty properties. Does **not** close this.

---

### 2. `grantMonthlyCreditsForAgency` masks `!result.ok` as `skipped: true` — critical for **cron**, not the webhook root cause

**Path:** `grant-engine.ts` L105–108; consumers `monthly-cycle.ts`, seat webhook via `triggerInitialGrantAfterSeatCheckout`.

```ts
if (!result.ok) {
  console.warn("[grant-engine] monthly grant:", result.error);
  return { granted: 0, skipped: true }; // no error field
}
```

Compare expire: hard failures return `{ skipped: true, error: "..." }` and `runMonthlyCreditCycle` sets `ok: false` → credits-cycle HTTP 5xx → retry.

Grant RPC failures look like intentional skips (`amount <= 0`, idempotent already-granted). Cycle still `ok: true` → cron **200**, no retry.

**Seat webhook:** masking is **not** the ACK root cause. `handlePricingCheckoutWebhook` already ignores the grant return and ACKs on entitlements alone (prior finding). Even `{ error }` would not NACK today.

**Cron trigger:**

1. `/api/cron/credits-cycle` on the 1st.
2. `apply_monthly_grant_credits` fails for agency A (transient RPC / lock).
3. Engine returns `{ skipped: true }` (no `error`).
4. Cycle `ok: true` → cron 200 → no platform retry.
5. Agency A stays without that month’s grant until next cycle or manual re-run.

**Not in #859** (expire repair only).

## Cleared / not elevated

- #859 repair CAS / #843 upsert-first — open, out of scope.
- 500-row list truncation on recalculate — previously HIGH (2026-08-25); not re-filed as CRITICAL here.
- Expire refuse when current-period grant exists — intentional customer-favorable soft skip.

## Verdict

**Two new CRITICAL findings** above. Masking answer: **cron = yes critical; seat webhook = not the root cause** (caller ignores result).
