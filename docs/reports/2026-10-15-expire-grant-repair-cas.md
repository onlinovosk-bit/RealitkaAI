# Fix: expire grant repair no longer wipes purchased credits

**Date:** 2026-10-15  
**Branch:** `cursor/fix-expire-grant-repair-cas`  
**Severity:** CRITICAL — paid credit data loss under concurrency

## Bug

`expireGrantCreditsForAgency` repair path (ledger already has expiry key, grant pool still &gt; 0) wrote:

```ts
credits_balance: agency.purchased_credits_balance // cron snapshot
```

Callers load agency rows once, then loop. Between snapshot and repair, `apply_credit_purchase` can raise `purchased_credits_balance`. The absolute write then set `credits_balance` to the stale snapshot → silent loss of paid credits (ledger still correct).

Happy-path expire already uses `expire_grant_credits` (FOR UPDATE). Only the repair branch was unsafe.

## Trigger

1. Prior cycle inserts expiry ledger row but leaves `grant_credits_balance &gt; 0`.
2. Cron loads agency with `purchased_credits_balance = 80`.
3. Concurrent top-up → purchased = 180.
4. Repair writes `credits_balance = 80` → −100 paid credits missing from agency balance.

## Fix

`repairUnclearedGrantExpiry`:

1. Re-read live `purchased_credits_balance` + `grant_credits_balance`.
2. CAS update: `.eq(purchased, live).eq(grant, live)` then set `grant=0`, `credits_balance=purchased`.
3. 0 rows updated → `concurrent_credit_mutation` (fail-closed; next cron retries).

No schema change — works on PROD without a new migration apply.

## Validation

```text
npx vitest run src/lib/__tests__/grant-engine.test.ts
# 23 passed
```

New cases: live purchased (180) used instead of snapshot (80); CAS miss returns error without overwrite.

## Out of scope (separate)

- FINDING-1: ghostwriter / confirm-viewing missing `requireFeature` after trial close — still open, not this PR.
- #843 matching wipe, #845 pricing-v2 stale webhook — still open.
