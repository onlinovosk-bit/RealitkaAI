# Recommendations wipe on match-read soft-fail

**Date:** 2026-10-28  
**Head:** `origin/main` @ `03f6c719`  
**Severity:** HIGH (silent `ai_recommendations` corruption / wipe)

## Bug

`recommendations-store` `listPersistedMatches` soft-failed DB errors to `[]`.  
`recalculateAllRecommendations` / `recalculateRecommendationsForLead` treated that as “no matches”, then **DELETE** existing `ai_recommendations` and rebuilt (often only `missing_inventory_match`).

Distinct from #927 (empty / `LIST_MAX` **lead** page).

## Trigger

1. Agency has stored match-based recommendations.  
2. `POST /api/recommendations/recalculate` (global or `leadId`).  
3. `lead_property_matches` SELECT errors (timeout, transient DB).  
4. Soft-fail `[]` → clear + rebuild → HTTP 200, rows gone / replaced.

## Fix

Fail-closed: match read returns `{ ok: false }` on error; recalculate skips delete/insert and keeps stored rows. Honest empty `data: []` still rebuilds.

## Validation

```bash
cd apps/crm && npx vitest run \
  src/lib/__tests__/recommendations-recalculate-fail-closed.test.ts \
  tests/verification/matching-recommendations-scoped-writes.verification.test.ts
```
