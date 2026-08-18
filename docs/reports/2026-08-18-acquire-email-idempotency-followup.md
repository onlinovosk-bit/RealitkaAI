# Acquire email idempotency follow-up

**Date:** 2026-08-18  
**Branch:** `cursor/acquire-email-idempotency-dabc`  
**Mode:** fix branch based on PR #439. No production writes. No schema change.

## Why this follow-up exists

Kontrolor review of PR #439 found a remaining retry risk:

1. `acquire_dedup_keys` was released after a `leads.insert` error.
2. Supabase HTTP timeout/abort can leave the insert commit state unknown.
3. If PostgREST eventually committed the lead but the route deleted the dedup key,
   a retry could insert a second lead because `leads` had no inbound event unique key.

## Fix

The route now derives `leads.id` deterministically from the acquire dedup key:

```text
sha256("acquire-email-lead:" + dedupKey) -> UUID-shaped text id
```

Effect:

- If the first attempt did not commit, deleting the dedup key lets a retry create the lead.
- If the first attempt did commit after an HTTP timeout, the retry uses the same `leads.id`,
  hits the primary key, loads the existing lead, and returns `lead_created=false`.

This avoids a new migration while preserving the original `leads.id text primary key`
contract.

## Verification target

Unit tests cover:

- deterministic retry after unknown commit does not duplicate the lead;
- rollback still releases the dedup key on failed lead insert;
- concurrent dedup unique conflict still returns duplicate without a second lead.

Verification test locks the live spec markers in `tests/verification/acquire-email-gateway.verification.test.ts`.

## Verification performed

```text
npm test -- src/app/api/acquire/email/__tests__/route.test.ts tests/verification/acquire-email-gateway.verification.test.ts
Test Files  2 passed (2)
Tests       8 passed (8)

npm run lint
PASS

npm run build
PASS — Compiled successfully in 29.1s
```

Setup note: `npm ci` was run in `apps/crm` because the cloud workspace had no local
Vitest install; no dependency files changed.

## Not done

- No PROD SQL.
- No new column/table.
- No merge.
