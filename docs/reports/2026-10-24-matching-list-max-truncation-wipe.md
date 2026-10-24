# Critical bug: matching recalculate wipes off-page matches (LIST_MAX)

**Date:** 2026-10-24  
**Lane:** critical-bug automation  
**Branch:** `cursor/matching-list-max-truncation-wipe`

## Bug and impact

`recalculateMatchesForLead` / `ForProperty` / `All` treat a single `listProperties` / `listLeads` page (hard-capped at 500) as the full tenant inventory, then DELETE existing `lead_property_matches` and INSERT only against that page.

**Trigger:** Agency with >500 properties. Agent updates a lead → `autoRecalculateForLead` → delete all matches for that lead → rebuild top-35 against newest 500 properties only. Matches that pointed at older/off-page inventory are permanently gone; HTTP/UI still look successful.

Same class for property recalculate (>500 leads) and global recalculate (either side at cap).

Distinct from open #843 (timeout after delete) and #883 (empty soft-fail `[]`).

## Root cause

`PROPERTIES_LIST_MAX` / `LEADS_LIST_MAX` = 500 with `.range(offset, offset+limit-1)`. Recalculate never pages and never fails closed on a full page before mutating.

## Fix

Fail-closed: if either list length `>= LIST_MAX`, skip delete/insert and keep stored matches (warn log). Prefer stale matches over silent wipe until full page-through exists.

## Validation

```text
cd apps/crm && npx vitest run src/lib/__tests__/matching-recalculate-scoped-reads.test.ts
# Test Files  1 passed (1) — Tests  8 passed (8)
```

## Out of scope

Page-all inventory helper; `recommendations-store` clear-all under the same cap; merge of #843/#883.
