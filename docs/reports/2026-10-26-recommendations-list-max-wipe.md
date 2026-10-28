# Critical bug: recommendations recalculate wipes off-page / all rows

**Date:** 2026-10-26  
**Lane:** critical-bug automation  
**Branch:** `cursor/critical-bug-management-61d5`

## Bug and impact

`recalculateAllRecommendations` calls `listLeads` (hard-capped at `LEADS_LIST_MAX` = 500), then `clearRecommendations` (DELETE all `ai_recommendations` for the tenant), then rebuilds only from the returned page.

**Triggers:**

1. Agency with >500 leads → UI „Prepočítať AI odporúčania" (`POST /api/recommendations/recalculate` without `leadId`) → off-page leads permanently lose recommendations; response still `{ ok: true }`.
2. Prod soft-fail: `listLeads` returns `[]` on DB error / missing agency → clear runs → **entire** `ai_recommendations` table wiped, 0 rows inserted.

Same truncation class as open matching fix #924; this path had no fail-closed guard.

## Root cause

Global clear assumed one `listLeads` page was the full inventory. No empty / `LIST_MAX` check before mutating.

## Fix

Fail-closed before `clearRecommendations` when `leads.length === 0` or `>= LEADS_LIST_MAX`: log warn, return `totalRows: 0`, leave existing rows untouched.

## Validation

- `npx vitest run src/lib/__tests__/recommendations-recalculate-fail-closed.test.ts` (empty / LIST_MAX / happy path).
