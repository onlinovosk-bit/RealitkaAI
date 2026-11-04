# Critical bug hunt — untracked wipe / data-loss patterns (2026-11-04)

**Scope:** `apps/crm` stores, import routes, inbound capture, property sync — patterns: DELETE→INSERT orphans, truncated lists + global clear, soft-fail `[]` + rebuild, fail-open reads, cross-tenant upsert.

**Explicitly skipped (already tracked):** matching LIST_MAX #924, matching DELETE-INSERT #843, recommendations page cap #937, recommendations soft-fail #930, gmail #902/#911, acquire dedup #881, outreach agency #923.

**Method:** Static code review + cross-check against `docs/reports/2026-08-25-critical-bug-hunt.md` and open PR register. No PROD DB mutation.

---

## Verdict

**4 NEW findings** meet high bar (concrete trigger, silent or hard-to-revert data loss, high code confidence). Several related paths were **not** re-filed because they overlap skipped PRs (#924 / #843 / #930 / #937).

---

## 1. CRITICAL — Global `ai_recommendations` wiped when insert fails after `clearRecommendations`

| | |
|---|---|
| **Path** | `apps/crm/src/lib/recommendations-store.ts` — `recalculateAllRecommendations` → `clearRecommendations` then `insertRecommendations` (no transaction) |
| **Trigger** | Authenticated `POST /api/recommendations/recalculate` for a tenant with **1–499 leads** (passes `leadInventoryUnsafeForGlobalClear`), `clearRecommendations` succeeds, then insert fails (RLS, constraint, payload/timeout, missing column after partial deploy). |
| **Impact** | **Entire tenant `ai_recommendations` table empty** while HTTP 400/500; UI shows no recommendations until a later successful recalc. Fail-closed on LIST_MAX/empty **does not** protect this path. |
| **Confidence** | **High** — unconditional `delete().not("id","is", null)` at line ~116–119, then throw on insert at ~171–176. |
| **Not duplicate of** | #937 (truncated lead page), #930 (soft-fail match read before clear). |
| **Minimal fix** | Upsert/replace in batches inside a DB transaction, or delete only after successful insert of replacement set (swap), or insert-first + delete orphans. |

---

## 2. HIGH — AI scoring recommendations DELETE→INSERT orphan per recalc

| | |
|---|---|
| **Path** | `apps/crm/src/lib/ai-scoring-store.ts` — `writeScoringRecommendations` |
| **Trigger** | `POST /api/scoring/recalculate` (global or `leadId`); delete on `ai_recommendations` for `lead_id IN (…)` and types `scoring_priority` / `scoring_risk` / `scoring_opportunity` succeeds; subsequent `insert(rows)` throws. |
| **Impact** | **Silent loss** of scoring-derived recommendations for all leads in that batch (up to 500 on global recalc); activity log may still record success from outer handler depending on failure timing. |
| **Confidence** | **High** — delete at ~64–72, insert at ~107–117, no transaction/compensation. |
| **Not duplicate of** | #843 (matching `lead_property_matches` upsert-first PR). |

---

## 3. CRITICAL — `/api/agents/cleaner` deletes by legacy `lead_score`, not CRM `score`

| | |
|---|---|
| **Path** | `apps/crm/src/app/api/agents/cleaner/route.ts` |
| **Trigger** | `GET /api/agents/cleaner` with valid `revolisGuard` **and** a Supabase client that can delete rows under RLS (e.g. accidental browser/cron call with session — not the default cookie-less cron path). |
| **Root cause** | `delete().lt('lead_score', 20)` while product reads/writes **`leads.score`** (`leads-store` `LEADS_LIST_SELECT`). Prod audit (`docs/LEADS-SCORE-AUDIT.md`): all Smolko leads had **`score = 0`**; display 22/100 is UI mapping, not DB score. If `lead_score` column exists and stays at default **0**, predicate matches **~all leads**. |
| **Impact** | **Mass lead deletion** for the visible tenant (not “low quality” leads by product scoring). |
| **Confidence** | **High** on wrong-column logic; **medium** on production trigger frequency (discovery F-07: cookie-less cron may delete 0 rows). |
| **Minimal fix** | Remove route or gate behind dry-run + explicit `agency_id`; filter on `score` with documented threshold; never expose without tenant scope. |

---

## 4. HIGH — Per-lead recommendation wipe on insert failure

| | |
|---|---|
| **Path** | `apps/crm/src/lib/recommendations-store.ts` — `recalculateRecommendationsForLead` |
| **Trigger** | `POST /api/recommendations/recalculate` with `leadId`; delete all `ai_recommendations` for that `lead_id` (~200–203), then `insertRecommendations` throws. |
| **Impact** | **Single lead loses all recommendations** with error response; no rollback. |
| **Confidence** | **High** |

---

## Checked / not filed (overlap or below bar)

| Area | Result |
|------|--------|
| `recalculateAllMatches` LIST_MAX / global delete | **#924** (+ 2026-08-25 finding 4) |
| Matching timeout after delete, insert skipped | **#843** |
| `listPersistedMatches` soft-fail `[]` + global recommendation clear | **#930** (partial guards on main) |
| `recalculateAllRecommendations` LIST_MAX page cap | **#937** / fail-closed guard on main |
| Gmail pull truncation / dedup | **#902 / #911** |
| Acquire email dedup | **#881** |
| Universal import / portal CSV | Agency-scoped email map; no clear+rebuild wipe found |
| Realvia / UC property sync | Tenant-scoped upsert; soft-delete by `agency_id` + `source_id` |
| Demand D4 matching | Upsert only; no delete-all |
| `runAImatching` cron without scoped client | Fail-closed empty reads → **no delete** (cron effectively no-op for matching) |
| `POST /api/import` JSON batch | Email dedup query omits explicit `agency_id` filter (relies on RLS); global `UNIQUE(email)` — collision/confusion risk, not a confirmed silent wipe without RLS audit |

---

## Kontrolór

| Claim | Verdict |
|-------|---------|
| clearRecommendations runs before insert without transaction | PASS (source) |
| writeScoringRecommendations delete-before-insert | PASS (source) |
| cleaner uses `lead_score` not `score` | PASS (source + LEADS-SCORE-AUDIT) |
| Skipped issues re-listed as new | PASS — excluded |
