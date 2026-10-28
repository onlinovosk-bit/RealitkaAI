# Lead recalculate: empty `listProperties` wiped matches

**Date:** 2026-10-18  
**Severity:** critical (silent match data loss)  
**Status:** fixed on branch `cursor/fix-lead-recalc-empty-properties`

## Bug

`recalculateMatchesForLead` deleted all `lead_property_matches` for a lead whenever `listProperties` returned `[]`, then inserted 0 and returned success.

`recalculateMatchesForProperty` and `recalculateAllMatches` already refuse to delete on an empty read. The lead path did not.

## Why empty is not trustworthy

In production, `listProperties` soft-fails to `[]` on DB errors (`properties-store.ts`: `if (error || !data) { … return [] }`). A missing session `agency_id` also returns `[]`. Neither means “this lead has no matching inventory.”

## Concrete trigger

1. Agency has properties and existing matches for lead L.
2. Agent saves lead L → `autoRecalculateForLead` → `recalculateMatchesForLead`.
3. `listProperties` hits a transient DB error (or missing agency on the request client) → `[]`.
4. DELETE all matches for L; insert skipped; activity says “Zapísaných zhôd: 0”.
5. Matching UI for that lead is empty until a later successful recalculate.

## Fix

Guard before delete (same rationale as property/all paths):

```ts
if (properties.length === 0) {
  return { mode: "lead", leadId, inserted: 0 };
}
```

## Validation

- `npx vitest run src/lib/__tests__/matching-recalculate-scoped-reads.test.ts`

## Related (not this PR)

Open #843 fixes DELETE-then-INSERT timeout wipe (upsert-first). Even after that merges, an empty property read would still clear the lead scope unless this empty-read guard is present — distinct root cause.
