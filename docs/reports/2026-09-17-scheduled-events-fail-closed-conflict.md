# Fix: scheduled-events free/busy + idempotency fail-closed

**Date:** 2026-09-17  
**Branch:** `cursor/fix-scheduled-events-fail-closed-conflict`  
**Source:** critical-bug automation (cron)

## Bug and impact

`createScheduledEvent` (SMO-B09, landed in #569) checks idempotency and free/busy
before insert. Both helpers treated Supabase **errors** as empty results:

- `findConflictingScheduledEvents` → `return []` on error
- `findScheduledEventByIdempotencyKey` → `return null` on error

**Trigger:** statement timeout / connection reset / PostgREST error during the
pre-insert SELECT (same class as the 8s fetch abort elsewhere in CRM).

**Impact:** create proceeds and inserts a second viewing into an occupied slot
(or a duplicate of an existing idempotent booking). Client gets HTTP 201 —
false “termín potvrdený” — exactly what SMO-B09 was meant to stop.

## Root cause

Fail-open empty-result mapping on read errors in the conflict/dedup path.

## Fix

Throw on SELECT errors (and when the DB client is unavailable) so
`POST /api/scheduled-events` returns 400 instead of inserting.

## Validation

```text
npx vitest run src/lib/scheduled-events/__tests__/store-idempotency.test.ts
→ 9 passed (incl. 2 new fail-closed cases)
```

## Also noted (not fixed here)

- Open PR #444 still covers matching recalculate tenant wipe (awaiting review).
- Merged #548 removed from automation MEMORIES.
- `POST /api/team/users` still has no authenticated `profiles` INSERT policy
  (noted since 2026-09-15; invite path is the workaround; GO for service-role fix).
- `social-scout` / `night-watch` tenant scope still GO-gated per founder-alert v0.2.
