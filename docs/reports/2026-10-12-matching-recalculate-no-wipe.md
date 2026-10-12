# Fix: matching recalculate wipe window (upsert-then-orphan-delete)

**Date:** 2026-10-12  
**Branch:** `cursor/critical-bug-management-c308`  
**Severity:** HIGH — silent data loss

## Bug

`recalculateMatchesForLead` / `ForProperty` / `AllMatches` deleted `lead_property_matches` first, then inserted. If the insert timed out (`MATCH_DB_TIMEOUT_MS`, default 8s) or hit a recoverable network error, the catch returned `{inserted:0}` / `{totalRows:0}` and `POST /api/matching/recalculate` answered **200**. Prior matches were already gone.

Concrete trigger: authenticated agent runs manual recalculate on a lead (or global) while DB is slow; delete completes; insert races the 8s client timeout → empty match list with success UI.

Origin: remaining finding from closed #444 (unscoped-read wipe fixed in #719; this second wipe path stayed).

## Fix

`persistRecalculatedMatches` in `apps/crm/src/lib/matching-store.ts`:

1. Upsert new rows on unique `(lead_id, property_id)` first.
2. Then delete orphans (rows outside the new set), or delete the scope only when the new set is empty.
3. Upsert timeout → keep existing matches (no delete).
4. Orphan-delete timeout after successful upsert → keep new rows; stale extras may remain (preferable to wipe).

## Validation

- `npx vitest run src/lib/__tests__/matching-recalculate-no-wipe.test.ts`
- `npx vitest run src/lib/__tests__/matching-recalculate-scoped-reads.test.ts`
- `npx vitest run tests/verification/matching-recommendations-scoped-writes.verification.test.ts`
