# Critical bug hunt: matching / recommendations wipe paths (main)

**Date:** 2026-11-03  
**Scope:** `apps/crm/src/lib/matching-store.ts`, `apps/crm/src/lib/recommendations-store.ts`, cron/API that clear `ai_recommendations` / `lead_property_matches`  
**Head checked:** `24d0eed6` (`main` via branch `cursor/critical-bug-remediation-8d1d`)  
**Verdict:** **4 NEW candidates** (not in the already-tracked set)

## Already tracked — verified still present on main, not re-reported

| ID | Class | Main still open? |
|----|--------|------------------|
| #843 | matching DELETE→INSERT timeout soft-fail wipe | OPEN; delete-then-insert still in `matching-store.ts` |
| #924 | matching LIST_MAX truncation wipe | OPEN; no `LIST_MAX` fail-closed in matching-store |
| #883 | lead recalc empty property soft-fail | MERGED; empty `properties` guard present |
| #930 | recommendations match-read soft-fail → wipe | OPEN; local `listPersistedMatches` still `error → []` |
| #937 | recommendations match page cap (PostgREST 1000) | OPEN; no `MATCHES_READ_MAX` guard on main |
| #927 | recommendations global lead LIST_MAX / empty | MERGED; `leadInventoryUnsafeForGlobalClear` present |

## Non-candidates (checked)

- `GET /api/cron/daily-match` → `runAImatching()` → `recalculateAllMatches()` **without** scoped client (`matching-engine.ts:16`). Cookie-less read → empty leads/properties → empty guard returns without delete. Broken job, **not** a wipe.
- `POST /api/scoring/recalculate` drops the request-scoped client (`scoring/recalculate/route.ts:22-26`) → scoring store resolves browser singleton → empty inventory / RLS no-op deletes. Broken scoring path, **not** a proven wipe of existing rows under tenant RLS.
- Honest algorithm empty (`getMatchingPropertiesForLead` → 0) after a trustworthy non-empty inventory read: intentional clear of that lead/property scope.

---

## NEW-1 — Multi-agency RLS clear vs single-agency rebuild (wrong agency scope)

**Files / lines**

- `apps/crm/src/lib/matching-store.ts:522-526` — global delete `.not("id", "is", null)`
- `apps/crm/src/lib/recommendations-store.ts:116-119` — `clearRecommendations` same pattern
- Reads rebuild from `listLeads` / `listProperties`, which pin **one** `resolveSessionAgencyId` (`leads-store.ts:810-821`; properties post-filter via `scopePropertyRowsToProfileAgency`)

**Mechanism**

RLS on both tables is `lead_id ∈ leads.agency_id ∈ profile_agencies_for_auth()` (SETOF — **all** agencies linked to the auth user by `auth_user_id` / `profiles.id` / **email match**). Global clear deletes every visible row across those agencies. Rebuild inserts only for the single session agency.

**Concrete trigger**

1. Auth user resolves to ≥2 agencies via `profile_agencies_for_auth()` (second profile row or email-matched profile in another agency).
2. Session `resolveSessionAgencyId` = agency A.
3. Agency B has stored `lead_property_matches` / `ai_recommendations`.
4. `POST /api/matching/recalculate` (no body) or `POST /api/recommendations/recalculate` (no `leadId`), with leads/properties for A non-empty and under LIST_MAX.
5. Delete removes A **and** B rows; insert restores only A → **B permanently wiped**. HTTP 200.

**Distinct from:** #843 / #924 / #927 (single-tenant truncation / timeout).

---

## NEW-2 — `listProperties` missing SQL `agency_id` filter → multi-agency page pollution (partial inventory ≠ full inventory)

**Files / lines**

- `apps/crm/src/lib/properties-store.ts:369-374` — `from("properties").select…range(offset, offset+limit-1)` **without** `.eq("agency_id", agencyId)`
- `apps/crm/src/lib/properties-store.ts:419-422` — agency filter only **after** the capped page
- Consumers that DELETE then rebuild from that list:
  - `matching-store.ts:328` + `:338-347` (`recalculateMatchesForLead`)
  - `matching-store.ts:511-525` (`recalculateAllMatches`)

**Mechanism**

For a multi-agency user, PostgREST returns a mixed A+B page (RLS allows both), then the app keeps only session-agency rows. Result length can be in `(0, LIST_MAX)` while agency A still has unseen properties. Empty guard does not fire; LIST_MAX guard from #924 would not fire either.

**Concrete trigger**

1. User in agencies A and B; session = A.
2. B has many recent properties; A has matches pointing at older A inventory that loses the shared 500-row page.
3. Agent saves an A lead → `autoRecalculateForLead` → `listProperties` returns partial A set (e.g. 40) → DELETE all matches for that lead → INSERT only vs partial set.
4. Matches to A properties missing from the polluted page are gone; UI/API succeed.

**Distinct from:** #924 (guards only `length >= LIST_MAX` on the **filtered** array); #883 (empty `[]` only).

---

## NEW-3 — Recommendations clear is type-blind; rebuild is engine-only (scoring / manual wipe)

**Files / lines**

- `apps/crm/src/lib/recommendations-store.ts:116-119` — global delete all rows
- `apps/crm/src/lib/recommendations-store.ts:200-203` — per-lead delete all types for `lead_id`
- Rebuild via `generateRecommendationsForLead` only (`recommendations-engine.ts`) — status/NBA/follow-up/`property_match`/`missing_inventory_match`
- Parallel writer: `ai-scoring-store.ts:64-68` inserts `scoring_priority` / `scoring_risk` / `scoring_opportunity`; manual path `leads-store.ts` `createAiRecommendation`

**Concrete trigger**

1. Scoring (or manual admin create) has written non-engine rows into `ai_recommendations`.
2. Broker runs `POST /api/recommendations/recalculate` (global, under LIST_MAX) or `{ leadId }`.
3. Clear/delete removes **all** types; insert restores only engine types → scoring_* and custom rows permanently gone until scoring is run again (customs never auto-restored).

**Distinct from:** #927 / #930 / #937 (those protect incomplete **inventory reads**, not type-narrow rebuild after a broad clear).

---

## NEW-4 — Recommendations DELETE-then-INSERT failure window (sibling of matching #843)

**Files / lines**

- Global: `recommendations-store.ts:248` (`await clearRecommendations`) then `:255` (`insertRecommendations`)
- Per-lead: `recommendations-store.ts:200-203` delete then `:219` insert

**Concrete trigger**

1. Global path passes `leadInventoryUnsafeForGlobalClear` (1..499 leads).
2. `clearRecommendations` succeeds (tenant `ai_recommendations` empty under RLS).
3. Insert fails (statement timeout, network, constraint, payload size).
4. Route returns **400**, but rows are already gone — no restore. Same class as matching #843, but recommendations has **no** upsert-first fix open.

Per-lead: same window for one `lead_id` after delete.

**Distinct from:** #843 (matching only); #930/#937 (read-side guards before clear — they do not make insert-after-clear atomic).

---

## Suggested fix order (for a later GO — not implemented in this hunt)

1. **NEW-1 / NEW-2:** Scope every global clear and every inventory read with explicit `.eq` / join on **session** `agency_id` (never rely on multi-value `profile_agencies_for_auth` for destructive rebuild). Add `.eq("agency_id", agencyId)` to `listProperties` select.
2. **NEW-4:** Upsert/rebuild-then-orphan-delete for recommendations (mirror #843).
3. **NEW-3:** Clear only engine recommendation types (or upsert by type); never delete `scoring_*` / manual rows from the NBA recalculate path.

## Evidence basis

Static read of main store/API/cron + RLS migrations `20260508230000_rls_lead_property_matches.sql`, `20260508210000_rls_tasks_recommendations.sql`, `profile_agencies_for_auth` in `20261006120000_self_serve_signup_foundation.sql`. No PROD mutation. Open PR bodies for #843/#924/#930/#937/#927/#883 checked so these four are not duplicates.
