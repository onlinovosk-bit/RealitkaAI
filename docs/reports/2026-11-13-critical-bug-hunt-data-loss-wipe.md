# Critical bug hunt — data-loss / wipe / race (2026-11-13)

**Head:** `origin/main` @ `c0ed01e97c742a1746ff88be2074e362e0b6eba0`  
**Scope:** matching-store, recommendations-store, import/xlsx/portal sync, Gmail/outreach, bus/model-gateway CRM wiring, cron absolute balances / unscoped deletes.  
**Skipped (already tracked — do not re-report):** #948 #944 #930 #924 #843 #859 #881 #911 #902 #923 (and billing/auth PRs outside wipe class).

## CRITICAL (new / untracked)

### 1. recommendations clear-then-insert is non-atomic (sibling of #843, never PR’d)

| | |
|---|---|
| **Where** | `apps/crm/src/lib/recommendations-store.ts` global `:309`→`:316`; per-lead `:248`→`:267` |
| **Trigger A** | Authenticated `POST /api/recommendations/recalculate` `{}` (or `{leadId}`) when inventory guards pass (`leads` 1…499, matches &lt; 1000), `clearRecommendations` / per-lead `delete` succeeds, then `insertRecommendations` fails (timeout, payload, constraint). Route returns **400**; table already empty for that scope. |
| **Trigger B** | Same global endpoint when **every** lead on the page yields `[]` from `generateRecommendationsForLead` — e.g. only `Uzavretý` / `Stratený` with `matchScore &lt; 80` and `score &lt; 90` (engine has no status branch for terminal). `insertRecommendations([])` returns `{inserted:0}` **without error** → HTTP **200** `ok:true`, `totalRows:0`. |
| **Impact** | Permanent wipe of RLS-visible `ai_recommendations`. Compounded by open #944 (type-blind clear also drops `scoring_*` / manual). Distinct from #843 (matching-only upsert PR), #930 (soft-fail match read→`[]`), #927/#937 (LIST_MAX / match-cap guards already on main). |
| **Fix shape** | Same class as #843: upsert/rebuild first, then orphan-delete only engine types; or refuse clear when generated payload is empty; never soft-succeed after a successful clear with zero inserts. Prefer coordinating with #944 type filter in one merge order. |

## Medium / latent (not new CRITICAL)

| Note | Evidence |
|---|---|
| `agents/cleaner` unscoped `leads.delete().lt('lead_score', 20)` | `apps/crm/src/app/api/agents/cleaner/route.ts:8` — column on `leads` is `score` (prod audit); wrong column → PostgREST error, not wipe. HMAC `revolisGuard` + cookie `createClient` → no session ⇒ RLS 0. Landmine if column aliased or service_role wired later. Not in `vercel.json` crons. |
| Scoring DELETE-INSERT | `ai-scoring-store.ts:64–117` filters `scoring_*` types; `/api/scoring/recalculate` drops scoped client → browser singleton on server → RLS typically blocks write (broken, not proven wipe). |
| Import / xlsx / portal / Realvia | Upsert/insert/update only; Realvia `processQueue` scopes `agency_id`. No DELETE-then-INSERT tenant wipe found. |
| Gmail pull / outreach | `markPulled`/`markError` resurrection still #911/#902; `SYSTEM_USAGE_AGENCY_ID` suppression fallback still #923. Seen-table prune filters `agency_id`. Suppressions are upsert-only (no wipe). |
| Bus / model-gateway | `@revolis/model-gateway` / `CostGovernor` **not imported by `apps/crm`** on main. Scripts + packages only; CRM wiring is separate open work (#949). No production CRM spend path on this head. |
| Cron absolute balances | Grant **repair** path still absolute `credits_balance` write — tracked #859. Happy path uses `expire_grant_credits` RPC. No new unscoped cron delete without `agency_id`. |
| Still live on main (tracked) | matching `delete().not(id)` multi-agency #948; matching LIST_MAX #924; matching delete-then-insert soft-return #843; recs soft-fail `[]` #930; type-blind clear #944; `listProperties` missing SQL `agency_id` (page pollution) #948. |

## Call-chain evidence (primary)

```text
POST /api/recommendations/recalculate
  → recalculateAllRecommendations(scoped)
      → listLeads / listPersistedMatches  (guards: empty|LIST_MAX|MATCHES_READ_MAX)
      → clearRecommendations  // DELETE ai_recommendations .not(id is null)
      → generateRecommendationsForLead × leads
      → insertRecommendations(rows)  // fail or rows=[] → empty table
```

## Verdict

**1 CRITICAL** untracked wipe window in recommendations recalculate (non-atomic clear-then-insert / empty rebuild).  
All other high-severity wipe patterns in the requested surfaces are either guarded, out of CRM prod wiring, or already covered by open tracked PRs.
