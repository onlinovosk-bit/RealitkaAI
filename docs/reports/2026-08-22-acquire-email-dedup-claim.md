# Acquire email dedup claim compensate (replay #439)

**Date:** 2026-08-22  
**Branch:** `cursor/acquire-email-dedup-claim-db1f`  
**Base:** `76bb31080aa0f6b7a0d77c33e5835402e64ee9ce` (origin/main)

## Problem

`POST /api/acquire/email` inserted into `acquire_dedup_keys` before the CRM lead and did not handle dedup insert errors. If the lead insert then failed, retries saw `duplicate=true` → `toLeadCandidate` returned null → inbound inquiry permanently lost. Ignored `23505` on concurrent dedup insert could also allow a second lead.

## Fix

1. `isUniqueConflict()` — treat Postgres `23505` (and duplicate/unique message) as already processed.
2. Check dedup insert errors; non-unique failures return 500.
3. On lead insert failure, DELETE the dedup claim by key so retries can recreate the lead.

## Validation

```bash
npm test --prefix apps/crm -- src/app/api/acquire/email/__tests__/route.test.ts tests/verification/acquire-email-gateway.verification.test.ts
```

Expected: **7/7 passed** (2 unit + 5 verification).
