# Critical bug hunt — matching / recommendations wipe paths (2026-10-25)

Branch tip at analysis: `cursor/critical-bug-management-58c9` @ `2f7cb14c` (main lineage through #917). **Read-only** — no fix PR from this hunt.

## Scope traced

| Path | Call chain |
|------|------------|
| Matching lead | `POST /api/leads` / `PATCH leads/[id]` → `autoRecalculateForLead` → `recalculateMatchesForLead` → `listProperties` (≤500) → DELETE `lead_id` → INSERT |
| Matching property | `PATCH properties/[id]` → `autoRecalculateForProperty` → `listLeads` (≤500) → empty guard → DELETE `property_id` → INSERT |
| Matching all | `POST /api/matching/recalculate` `{}` → `recalculateAllMatches` → `listLeads`+`listProperties` → empty guard → DELETE all → INSERT |
| Daily match cron | `GET /api/cron/daily-match` → `runAImatching` → `recalculateAllMatches()` **unscoped**; **not** in `apps/crm/vercel.json` crons |
| Recommendations all | UI `Prepočítať odporúčania` → `POST /api/recommendations/recalculate` `{}` → `recalculateAllRecommendations` → `listLeads`+local `listPersistedMatches` → **`clearRecommendations` (DELETE all)** → INSERT |
| Recommendations lead | same route with `leadId` → DELETE by `lead_id` → INSERT (lookup via `listLeads` page) |

List caps: `LEADS_LIST_MAX` / `PROPERTIES_LIST_MAX` = **500** (`leads-store.ts:91,102,824`, `properties-store.ts:78,93,374`). Prod soft-fail `[]` on list error: `leads-store.ts:847-850`, `properties-store.ts:413-415`.

## Already tracked (not re-filed)

| Issue | PR | Status on this tip |
|-------|-----|-------------------|
| LIST_MAX truncation wipe (matching) | #924 | OPEN — guard not on this tree yet |
| DELETE-then-INSERT insert timeout → silent wipe | #843 | OPEN — still DELETE then INSERT + recoverable catch returns `inserted:0` |
| Lead path empty `listProperties` soft-fail wipe | #883 | OPEN — lead path still has no empty guard; property/all do |

## NEW CRITICAL (distinct from #924 / #843 / #883)

### 1. Recommendations clear-all without empty / truncation guard

| | |
|---|---|
| **File:line** | `apps/crm/src/lib/recommendations-store.ts:217-238` (`recalculateAllRecommendations`); wipe at `:225` via `clearRecommendations` `:95-114` (`.delete().not("id","is",null)`). Trigger surface: `apps/crm/src/components/recommendations/recalculate-recommendations-panel.tsx:11-22` → `apps/crm/src/app/api/recommendations/recalculate/route.ts:34`. |
| **Concrete triggers** | **(A) Truncation:** agency with **>500 leads**; authenticated user clicks **„Prepočítať odporúčania“** (also in QA checklist). `listLeads()` returns only top 500 by `score,created_at`; then **all** `ai_recommendations` are deleted; rebuild covers only that page → permanent loss for off-page leads. **(B) Soft-fail empty:** same button while `listLeads` returns `[]` (prod DB error `leads-store.ts:847-850`, or missing `agency_id` `:812-814`) → clear-all then insert 0. |
| **Impact** | Tenant-scoped wipe of `ai_recommendations`. Truncation: silent loss for leads outside first page (HTTP 200, UI success). Soft-fail: full empty table after success-looking rebuild. |
| **Confidence** | **high** (code path + UI trigger). Agency currently >500 leads: not probed this run (Smolko historically ~451 — near cliff). Soft-fail empty does **not** need >500. |
| **Why distinct** | #924/#843/#883 fix **`lead_property_matches` / matching-store** only. No open PR mentions `clearRecommendations` / `recommendations-store` wipe. Matching `recalculateAllMatches` already fail-closes on empty reads (`matching-store.ts:510-512`); recommendations has **no** analogous guard and **no** LIST_MAX fail-closed check. |
| **Minimal fix direction** | Before `clearRecommendations`: if `leads.length === 0` **or** `leads.length >= LEADS_LIST_MAX`, return without delete (fail-closed). Prefer page-all / count+fail-closed long-term. Optionally upsert-per-lead then orphan-delete (same class as #843). |

### Related (not separately filed as equal-severity NEW)

- **Insert-after-clear failure window** (`:225` then `:232`): if insert throws after clear, agency recommendations already gone (error returned, not silent 200). Same anti-pattern as #843 without matching’s timeout soft-success. Fix folds into upsert-then-orphan or abort-before-clear.
- **`recalculateRecommendationsForLead`** (`:172-214`): uses `listLeads` to resolve lead — off-page / empty list throws before delete (no all-table wipe). Match soft-fail `[]` degrades content, does not clear-all.
- **Cron `daily-match`**: unscheduled in `vercel.json`; unscoped call → empty `listLeads` → matching empty guard skips delete. Not a new wipe bug; truncation if a future scoped cron lands remains #924.

## Verdict

**One NEW critical bug:** recommendations clear-all without empty/truncation guard — **critical and distinct** from #924/#843/#883.
