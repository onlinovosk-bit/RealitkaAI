# Critical bug hunt 2026-11-06 — data-loss wipe patterns

Report-only. No code fix. Branch: `cursor/critical-bug-hunt-2026-11-06`.

Skipped already-tracked: #924, #843, #883, #930, #937, #902/#911, #859, #881, #923.

## NEW high-severity candidates

### 1. recommendations type-blind clear
- **file:line:** `apps/crm/src/lib/recommendations-store.ts:154-168`, `:249-252`
- **trigger:** `POST /api/recommendations/recalculate` (global or `leadId`)
- **impact:** Deletes all `ai_recommendations` rows in scope (including `scoring_*` / non-engine types); rebuild inserts only engine types (`next_best_action`, `property_match`, …)
- **confidence:** high

### 2. recommendations DELETE-then-INSERT failure window
- **file:line:** `apps/crm/src/lib/recommendations-store.ts:309` then `:316`
- **trigger:** Global recalculate after inventory guards pass; insert/network error after clear
- **impact:** Table already cleared; failed insert leaves empty / partial recommendations (sibling of matching #843)
- **confidence:** high

### 3. Multi-agency RLS clear vs single-agency rebuild
- **file:line:** `apps/crm/src/lib/matching-store.ts:525`; `apps/crm/src/lib/recommendations-store.ts:167`; reads via `listLeads` `.eq("agency_id", agencyId)` (`leads-store.ts:821`)
- **trigger:** Global match/recommendation recalculate by a user with multiple agencies in `profile_agencies_for_auth()`
- **impact:** DELETE removes matches/recs for all RLS-visible agencies; rebuild only from one session agency → cross-agency wipe
- **confidence:** high

### 4. listProperties missing SQL agency_id + post-filter under-count
- **file:line:** `apps/crm/src/lib/properties-store.ts:369-423`
- **trigger:** Multi-agency RLS returns mixed agencies in first page; `scopePropertyRowsToProfileAgency` drops non-session rows → count &lt; `PROPERTIES_LIST_MAX` while inventory incomplete
- **impact:** Matching empty-only guards do not trip; DELETE+INSERT rebuilds from truncated property set (amplifies #924 class without needing a full 500 page)
- **confidence:** medium-high

### 5. ai-scoring-store scoring DELETE-then-INSERT
- **file:line:** `apps/crm/src/lib/ai-scoring-store.ts:64-122`; route `apps/crm/src/app/api/scoring/recalculate/route.ts:22-26` (no scoped client)
- **trigger:** `POST /api/scoring/recalculate`
- **impact:** Deletes `scoring_*` for lead IDs then inserts; insert failure wipes those rows. Route drops scoped Supabase → browser singleton on server (may soft-fail empty rather than wipe today)
- **confidence:** medium (pattern high; live wipe depends on client/session)

### 6. agents/cleaner unscoped lead hard-delete
- **file:line:** `apps/crm/src/app/api/agents/cleaner/route.ts:8`
- **trigger:** HMAC `revolisGuard` call to `/api/agents/cleaner`
- **impact:** `leads.delete().lt('lead_score', 20)` with no agency filter / count gate — mass hard-delete landmine if column exists and RLS allows
- **confidence:** medium (schema uses `score`; anonymous session may RLS no-op)

## Checked — not new wipe of this class
- `demand/match-store.ts` — upsert only, errors throw on property read
- `lead-signals/store.ts` — versioned upsert, empty signals no-op
- `integrations-store.ts` — intentional disconnect deletes
- `credits/mutate-credits.ts` — atomic RPCs
- `acquire/email` dedup `.delete()` — claim release after failed insert
- `valuation/submit` lead delete — compensating rollback
- `mail-outcome-reader` `AGGREGATE_MAX_ROWS` — truncated flag, no overwrite
- matching empty-property/lead guards present (LIST_MAX still #924)
