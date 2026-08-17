# Critical bug: acquire email dedup claim orphans leads

**Date:** 2026-08-17  
**Branch:** `cursor/critical-bug-management-2187`  
**Severity:** critical — permanent inbound lead loss

## Bug and impact

`POST /api/acquire/email` claimed `acquire_dedup_keys` **before** inserting the CRM lead, and ignored dedup insert errors. If the subsequent `leads` insert failed (constraint, timeout, abort), the Worker/retry path saw `duplicate=true` → `toLeadCandidate(..., true)` returned `null` → the inbound inquiry was never created again.

Amplification: #428 wired an 8s `fetchWithTimeout` onto the service-role client. A slow lead insert can abort after the dedup row already committed, making permanent loss much more likely than under the old 300s undici hang.

Concurrent race (same bug class): ignored `23505` on dedup insert let a second worker continue and insert a **second** lead.

## Root cause

Ordering + missing compensate:

1. INSERT dedup (unchecked)
2. INSERT lead — on error return 500 **without** deleting the dedup key
3. Retry SELECT finds key → treated as duplicate forever

## Fix

1. Check dedup insert errors; `23505` → already processed (no second lead).
2. On lead insert failure, DELETE the dedup claim by key so retries can recreate the lead.
3. Unit + verification tests lock the compensate path.

## Validation

```text
npx vitest run src/app/api/acquire/email/__tests__/route.test.ts \
  tests/verification/acquire-email-gateway.verification.test.ts
```

## Skipped (already open PRs)

#369, #370, #371, #374, #392, #401, #427, #438 — still open; not re-reported.
