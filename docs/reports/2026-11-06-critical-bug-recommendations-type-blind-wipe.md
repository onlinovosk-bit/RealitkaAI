# Critical bug: recommendations recalculate type-blind wipe

Date: 2026-11-06  
Scope: `apps/crm/src/lib/recommendations-store.ts`

## Bug and impact

`POST /api/recommendations/recalculate` (UI: Recommendations → prepočet) deleted **all** `ai_recommendations` in scope, then rebuilt only match-engine types.

Shared table also holds:

- `scoring_priority` / `scoring_risk` / `scoring_opportunity` from AI Scoring 2.0
- manual/admin rows (`assignment`, `custom`, …)

**Trigger:** authenticated user runs global or per-lead recommendation recalculate after scoring (or manual) rows exist.  
**Impact:** permanent loss of scoring + manual recommendations until scoring is re-run (manual rows are not regenerated).

## Root cause

`clearRecommendations` used `.delete().not("id", "is", null)` (all rows). Per-lead path used `.delete().eq("lead_id", leadId)` without a type filter. Scoring already scopes its own delete to `scoring_*`; the match engine did not mirror that.

## Fix

Delete only `ENGINE_RECOMMENDATION_TYPES` (types produced by `generateRecommendationsForLead`), global and per-lead, including demo store.

## Validation

- Unit: `recommendations-recalculate-fail-closed.test.ts` asserts delete `.in(recommendation_type, ENGINE_…)` and excludes scoring/manual types.
- Verification: `matching-recommendations-scoped-writes.verification.test.ts` locks the type-scoped delete pattern.
