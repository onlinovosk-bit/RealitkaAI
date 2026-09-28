# AI cost telemetry — where `costEur` goes and why nothing lands

**Date:** 2026-09-04  
**Wave:** Overnight Brief 16 / AGENT-E  
**Branch:** `chore/b16-ai-cost-truth`  
**Scope:** trace `estimateClaudeCostEur` / `estimateOpenAiCostEur` / `estimateOpenAiCostFromTotalTokens` call sites; explain empty spend in `credit_ledger`.

## Executive answer

`costEur` is **never designed to write into `credit_ledger`**. Every call site that persists cost targets `ai_action_audit.cost_eur` (and optionally `ai_generations.cost_eur`).

In production (queried 2026-09-03 / 2026-09-04):

| Object | State |
|--------|--------|
| `credit_ledger` | 6 rows — only `monthly_grant` (4) + `grant_expiry` (2). **0 spend rows.** |
| `ai_action_audit` | 30 rows, **last insert 2026-06-11**. Columns stop at baseline: **no `cost_eur`, `credits_spent`, `model`, `latency_ms`.** |
| `ai_cost_daily` view | **does not exist** |
| `ai_generations` | **does not exist** |
| `usage_metrics_daily` | 5 rows (token/ops counters — not EUR) |
| `ai_jobs` / `ai_recommendations` | 0 |

Repo migrations `apps/crm/supabase/migrations/20260611000002_ai_action_audit_cost.sql` and `20260611000004_ai_cost_daily.sql` add the cost columns + views. **They were never applied to prod.** After code started inserting those columns (~2026-06-11), `logAiAction` inserts fail and only `console.warn` (AP-010). That is why measured EUR “never lands.”

Separately: `CREDITS_ENFORCEMENT` defaults to **off**, so `spendForAction` → `spendCredits` → `credit_ledger` spend **never runs**. Credits expire unused. Looking for AI spend in `credit_ledger` will stay empty until enforcement is on **and** call sites charge.

---

## Trace table (6 estimate call sites)

| Volajúce miesto | Počíta costEur? | Kam sa zapisuje? | Zapíše sa naozaj? | Dôkaz | Verdikt |
|---|---|---|---|---|---|
| `lib/ai/listing-content.ts` → `generateListingContent` | Áno (`estimateClaudeCostEur`) | Vracia `audit.costEur`; caller `POST /api/ai/listing-content` → `logAiAction` + `saveGeneration` (`ai_generations.cost_eur`) | **Nie v prod** — `logAiAction` insert needs missing cols; `ai_generations` table missing | Route wires `costEur: audit.costEur` (`listing-content/route.ts`); prod `\d ai_action_audit` bez `cost_eur`; `to_regclass('ai_generations')` = null | **VOLÁ SA, NEZAPISUJE** |
| `lib/ai/dashboard-insights.ts` → `generateDashboardInsights` | Áno pri LLM success; `null` pri empty/fallback/timeout 800ms | Vracia `audit`; cron `generateAndCacheAgencyInsights` volal `logAiAction` | **Nie od 2026-06-11** (schema). Predtým 30 cron riadkov bez EUR stĺpcov | Prod: 30× `meta.feature=dashboard-insights`, `max(created_at)=2026-06-11`; cron route stále existuje | **VOLÁ SA, NEZAPISUJE** (do opravy nižšie) |
| `lib/rescore-lead.ts` → `getOpenAiInsight` | Áno (`estimateOpenAiCostEur`) | `logAiAction` → `ai_action_audit` | **Nie v prod** (missing cols). Fire-and-forget + catch swallow | `rescoreLead` volané z leads API / buyer-onboarding; insert path = `logAiAction` | **VOLÁ SA, NEZAPISUJE** |
| `lib/outreach-store.ts` (AI email generate) | Áno (`estimateOpenAiCostFromTotalTokens`) | `logAiAction` action `ai_email` | **Nie v prod** (missing cols). `outreach_send` audit **nemá** costEur (zámer — cost je na generate) | Riadok ~221–237 v `outreach-store.ts` | **VOLÁ SA, NEZAPISUJE** |
| `app/api/ai/call-coach/stream/route.ts` | Áno (`estimateClaudeCostEur` po `finalMessage`) | `logAiAction` action `call_coach` | **Nie v prod** (missing cols) | Stream route L84–94 | **VOLÁ SA, NEZAPISUJE** |
| `app/api/ghostwriter/generate/route.ts` | Áno (`estimateOpenAiCostEur`) | `logAiAction` action `ghostwriter` | **Nie v prod** (missing cols). Letter ide do `ghostwriter_letters` **bez** cost | Route L75–81 | **VOLÁ SA, NEZAPISUJE** |

Žiadne zo 6 miest nie je **NIKDY SA NEVOLÁ** (všetky majú produkčnú cestu). Žiadne nie je **ZAPISUJE SPRÁVNE** v dnešnom prod stave. **ZLÁ TABUĽKA** platí len ako *observer mistake*: hľadať EUR v `credit_ledger` — to nie je cieľ `costEur`.

---

## Why `credit_ledger` has zero consumption rows

1. **Different subsystem.** `costEur` → `ai_action_audit` / founder view `ai_cost_daily`. Ledger is credit grants/spends via `spend_credits` RPC.
2. **Enforcement off.** `spendForAction` returns `{ charged: false, reason: "disabled" }` unless `CREDITS_ENFORCEMENT=enforce` (`lib/credits/spend-for-action.ts`).
3. **Sparse call sites.** Among AI surfaces, only listing-content (+ property-launch-pack) call `spendForAction`. Rescore / outreach / call-coach / ghostwriter / dashboard-insights do **not** spend credits even when enforcement is on.
4. **Observed grants.** Prod ledger: +180 grant / −90 expiry — matches “60 credits expired unused” narrative (plus other agencies).

---

## Adjacent gaps (out of estimate-site list, still relevant)

- `POST /api/ai/listing-content/stream` streams Claude **without** any `estimate*CostEur` or audit write.
- `lib/ai/call-coach.ts` `generateCallCoachFeedback` calls Claude and **drops usage** (no cost estimate). The brief’s call-coach site is the **stream route**, which does estimate.
- `logAiAction` (`lib/ai-action-audit.ts`, outside this PR’s write scope) swallows insert errors → AP-010 for every remaining caller until schema is fixed or callers migrate to the tolerant helper.

---

## One in-scope fix (this PR)

**Unambiguous silent drop:** dashboard insights cron computed/passed `costEur` into `logAiAction`, which cannot insert on prod schema; side-effect fails, cron still returns `ok: true`.

**Fix:** `lib/ai/persist-cost-telemetry.ts` — try full column insert; on missing-column error, retry with cost fields in `meta` JSONB (columns that exist today). Wired **only** in `lib/ai/dashboard-insights-cron.ts`. Unit tests cover detector + fallback.

**Not done (by design):**
- No Model Router / Cost Governor / rate changes in `llm-usage-cost.ts`
- No DDL applied to prod (founder must apply existing migrations)
- Other 5 call sites still use `logAiAction` — remain broken until migration **or** follow-up to reuse the helper
- `credit_ledger` untouched

### Founder follow-up (outside agent)

Apply (do not invent new DDL):

1. `20260611000002_ai_action_audit_cost.sql`
2. `20260611000004_ai_cost_daily.sql`
3. (if listing drafts needed) whatever migration creates `ai_generations`

Then verify:

```sql
select count(*) filter (where cost_eur is not null) as with_col,
       count(*) filter (where (meta->>'costEur') is not null) as with_meta
from ai_action_audit
where created_at > now() - interval '7 days';
```

---

## Verdict summary

| Question | Answer |
|----------|--------|
| Where does `costEur` go? | Intended: `ai_action_audit.cost_eur` (+ listing `ai_generations`). Not `credit_ledger`. |
| Why nothing lands? | Prod schema missing cost columns → inserts fail silently since ~2026-06-11; plus low/no real LLM use on several paths; ledger spend gated off. |
| Is router unblocked? | **No** — until cost columns exist (or meta fallback is rolled to all sites) and traffic produces rows, routing optimizes a null signal. |
