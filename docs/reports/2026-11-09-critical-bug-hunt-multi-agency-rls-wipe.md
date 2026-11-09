# Critical bug hunt — multi-agency RLS wipe / inventory (2026-11-09)

Head verified: `origin/main` @ `c5a23644` (branch `cursor/critical-bug-remediation-2f4e`).
Scope: wipe / race / auth-bypass / null-deref / silent truncation. Report-only (no fix this run).

## Already tracked — not re-reported

#944, #930, #924, #843, #937 (fixed), #923, #911/#902, #881, #942, #941/#939/#935 (fixed).

## Prior untracked candidates — verdict

| # | Candidate | Verdict |
|---|---|---|
| 1 | Multi-agency RLS clear vs session-agency rebuild | **CONFIRMED HIGH** |
| 2 | `writeScoringRecommendations` DELETE-INSERT empty scoring | **NOT high-confidence active wipe** (latent + current route fails closed) |
| 3 | `agents/cleaner` unscoped `leads.delete().lt('lead_score',20)` | **NOT high-confidence active wipe** (wrong column + no session under cron) |
| 4 | `listProperties` missing SQL `agency_id` | **CONFIRMED HIGH** (multi-agency page pollution → incomplete inventory) |

## NEW high-confidence bugs

### 1) Multi-agency RLS clear / single-agency rebuild wipe

**Trigger:** Authenticated `POST /api/matching/recalculate` (mode all) or `POST /api/recommendations/recalculate` (mode all) while `profile_agencies_for_auth()` returns **>1** agency for the caller (confirmed-email match across profiles in different agencies; `auth_user_id` is unique so multi-agency is primarily the email branch in `20261006120000_self_serve_signup_foundation.sql`).

**Mechanism:**

- Deletes use RLS visibility over **all** agencies returned by `profile_agencies_for_auth()`:
  - `apps/crm/src/lib/matching-store.ts:522-526` — `lead_property_matches.delete().not("id","is",null)`
  - `apps/crm/src/lib/recommendations-store.ts:165-168` + `:309` — `ai_recommendations` clear-all
- Rebuild inventory is session-agency only:
  - `listLeads` applies `.eq("agency_id", agencyId)` (`leads-store.ts:818-821`) via `resolveSessionAgencyId` (one preferred profile).
- Result: other agencies’ matches / recommendations are deleted and **not** rebuilt.

**Impact:** Cross-tenant data wipe for sibling agencies visible under the same auth identity. HTTP can still look successful for the session agency.

**Confidence:** HIGH (structural asymmetry in code + RLS policies `lead_property_matches_agency` / `ai_recommendations_agency`).

### 2) `listProperties` missing SQL `agency_id` → incomplete inventory under multi-agency RLS

**Trigger:** Any path that calls `listProperties()` for a multi-agency identity (matching recalculate, lead auto-recalc via `matching-hooks`, property inventory UI / `loadPropertiesInventory`).

**Mechanism:**

- `apps/crm/src/lib/properties-store.ts:369-374` builds the select/range **without** `.eq("agency_id", agencyId)`.
- Agency is resolved (`:356-361`) then applied only as a **post-filter** (`:419-423` → `scopePropertyRowsToProfileAgency`).
- Mutations correctly use SQL `.eq("agency_id", …)` (`:476`, `:651`, `:666`, `:731`) — list path is inconsistent.
- With multi-agency RLS, the first `PROPERTIES_LIST_MAX` (500) rows can be a mix of agencies; filtering to the session agency yields an incomplete set even when that agency alone is under the cap (distinct root cause from LIST_MAX wipe #924).

**Impact:** Incomplete property inventory → matching rebuilds from a truncated set (fewer/wrong matches; per-lead save can DELETE then insert a thinner set). UI/KPI under-count inventory for multi-agency callers.

**Confidence:** HIGH (code path + RLS `properties_tenant` = `agency_id IN profile_agencies_for_auth()`).

## Candidates verified but not reported as active CRITICAL wipe

### Scoring DELETE-INSERT (`ai-scoring-store.ts:64-117`)

Pattern is a sibling of #843: delete `scoring_*` then insert; insert failure leaves those rows gone. However `POST /api/scoring/recalculate` creates a scoped server client and **never passes it**; `writeScoringRecommendations` / `recalculateScoringAndRecommendations` call `resolveTenantSupabase()` with no scoped arg → browser singleton without cookies on the server → RLS delete matches 0 rows. Current behaviour is broken/no-op writes, not a proven wipe. Latent if scoped client is wired without making the write transactional.

### `agents/cleaner` (`apps/crm/src/app/api/agents/cleaner/route.ts:8`)

`leads.delete().lt('lead_score', 20)` behind `revolisGuard`. `public.leads` schema uses `score`, not `lead_score` (baseline core). Cron path uses cookie `createClient()` with no user session → even a correct column would delete 0 under RLS. Dangerous stub / false-success risk, not an active mass hard-delete on current main.

## Scan notes (no NEW high-confidence beyond above)

- `team/users`, `profiles` PATCH: owner/founder gates + role allowlists look intact post #935/#939.
- `licensing.ts` free entitlement server actions remain #942 (skipped).
- Outreach `fetchLeadAgencyId` → `SYSTEM_USAGE_AGENCY_ID` fallback remains #923.
- Acquire email dedup release-on-insert-fail present; no new global wipe found in this pass.
- Daily-match cron calls `recalculateAllMatches()` unscoped → empty lead/property read → early return before delete (fail-closed for wipe).

## Suggested fix direction (not implemented)

1. Scope matching/recommendations global deletes to session `agency_id` (via lead subquery or explicit agency filter), never “all RLS-visible rows”.
2. Add `.eq("agency_id", agencyId)` on `listProperties` SQL before `range`, matching get/update/delete.
3. Optionally refuse global recalculate when `profile_agencies_for_auth()` cardinality > 1 until (1) lands.
