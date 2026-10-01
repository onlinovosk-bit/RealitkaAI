# Graph Audit — júl 2026 (Fáza 1, read-only)

**Autor:** overnight swarm vlna 1d · **Metóda:** statická analýza + CI log review  
**Kill kritérium Fázy 2:** quick winy musia znížiť p95 aspoň o **30 %**; inak sa **ExecutionGraph modul nestavia**.

---

## 1. Tabuľka uzlov (klasifikácia + dôkaz)

| Workflow | Uzol | Typ | Dôkaz | Odhad úspory |
|----------|------|-----|-------|--------------|
| `build-dossier.ts` | `enrichmentTool` → `webFetchStub` | **SEQUENTIAL-ZBYTOČNÉ** | `build-dossier.ts:154-155` — dva nezávislé await za sebou | ~200–800 ms (I/O bound) |
| `build-dossier.ts` | `maybeOpenAIDossier` po enrich+web | **SEQUENTIAL-NUTNÉ** | `156-161` — AI potrebuje oba vstupy | — |
| `build-dossier.ts` | `persistDossier` | **SIDE-EFFECT** | `163-169`, `persistDossier:140-144` — UPDATE `leads.dossier` | neparalelizovať bez TX |
| `dashboard-insights-gather.ts` | 6× DB read v `Promise.all` | **PARALLEL** | `gatherAgencyDashboardSummary:62-69` — referenčný vzor | — |
| `dashboard-insights-cron.ts` | `resolveAgencyDisplayName` (2× SELECT) | **SEQUENTIAL-ZBYTOČNÉ** | `45-59` — agencies.name potom profiles fallback | ~20–80 ms |
| `dashboard-insights-cron.ts` | `gatherSummary` → `gatherProperties` | **SEQUENTIAL-ZBYTOČNÉ** | `69-71` — nezávislé na rovnakom `agencyId` | ~100–400 ms |
| `dashboard-insights-cron.ts` | `generateDashboardInsights` (AI) | **CONDITIONAL** | `73-89` — timeout fallback | — |
| `dashboard-insights-cron.ts` | `dashboard_insights_cache` upsert | **SIDE-EFFECT** | `99+` | neparalelizovať |
| `cron/dashboard-insights/route.ts` | agency batch `Promise.all(3)` | **PARALLEL** | `37-48` | — |
| `lead-triage-batch.ts` | chunk loop `await triageChunk` | **SEQUENTIAL-NUTNÉ** | `136-139` — rate limit / token budget na AI | — |
| `lead-triage-batch.ts` | `callClaude` v chunk | **CONDITIONAL** | `96-106` — 429 → retry v claude wrapper | — |
| `enterprise-intelligence-store.ts` | `fetchLeadEventsOrdered` → pipeline → persist | **SIDE-EFFECT** | `runEnterprisePipelineAndPersist` — multi-write | **MIMO quick winov** |
| `cron/lead-ai-triage/route.ts` | load leads → triage → per-lead UPDATE | **SIDE-EFFECT** | sekvenčné zápisy priorít | TX analýza pred paralelou |
| `cron/morning-brief/route.ts` | per-agency sekvenčné kroky | **SEQUENTIAL-NUTNÉ** | závislosť na predchádzajúcom digest | audit detail W2 |
| `cron/heartbeat-check/route.ts` | HTTP health checks | **PARALLEL kandidát** | nezávislé URL | malý zisk |

Legenda typov: **SEQUENTIAL-NUTNÉ** (dátová závislosť) · **SEQUENTIAL-ZBYTOČNÉ** (Promise.all bezpečné) · **PARALLEL** (už OK) · **CONDITIONAL** · **SIDE-EFFECT**.

---

## 2. Baseline p50 / p95

| Metrika | research dossier build | dashboard insights cron (1 agency) | triage batch (18 leadov) |
|---------|------------------------|--------------------------------------|---------------------------|
| p50 | **unavailable** | **unavailable** | **unavailable** |
| p95 | **unavailable** | **unavailable** | **unavailable** |

**Dôvod:** v repe ani CI logoch nie je štruktúrované `duration_ms` per workflow uzol (cron routes logujú len celkové `duration_ms` na route, nie per agency).

**Minimálny logging krok (navrh):**

```ts
// dashboard-insights-cron.ts — wrap generateAndCacheAgencyInsights
const t0 = performance.now();
// ... existing body ...
console.info(JSON.stringify({
  tag: 'graph-audit',
  workflow: 'dashboard-insights-agency',
  agencyId,
  durationMs: Math.round(performance.now() - t0),
}));
```

Rovnaký vzor pre `buildDossier` (`tag: research-dossier-build`) a `triageLeadBatches` (`tag: lead-triage-batch`, `count: leads.length`).

---

## 3. Quick win plány (2×)

### Quick win 1 — `build-dossier`: paralelný enrich + web

**Diff plán (nie patch):**

1. V `buildDossier` nahradiť riadky 154–155:
   - `const [enriched, web] = await Promise.all([enrichmentTool(params.input), webFetchStub(\`record:${params.input.id}\`)]);`
2. Zachovať poradie: deterministic → maybeOpenAI → persist (SIDE-EFFECT na konci).

**Test plán:**

- Unit: mock `enrichmentTool` / `webFetchStub` — oba volané, výsledok dossier identický s baseline fixture.
- Integrácia: jeden lead — `persist: false`, porovnať JSON dossier pred/po.
- **429 simulácia:** mock OpenAI 429 v `maybeOpenAIDossier` — očakávaný fallback na deterministic dossier (existujúci catch `126-127`).
- **Tenant izolácia:** persist stále `.eq('agency_id', params.agencyId)`.

### Quick win 2 — `dashboard-insights-cron`: paralelný summary + properties

**Diff plán:**

1. Po `resolveAgencyDisplayName` (alebo po refaktore display name):
   - `const [summary, properties] = await Promise.all([gatherAgencyDashboardSummary(admin, agencyId), gatherAgencyProperties(admin, agencyId)]);`
2. Voliteľne: zlúčiť dva SELECT v `resolveAgencyDisplayName` do jedného dotazu (menší druhý win).

**Test plán:**

- Vitest s mock Supabase: overiť, že oba gatherery sa zavolajú a AI dostane rovnaký tvar payloadu.
- **Zlyhanie jednej vetvy:** mock reject na `gatherAgencyProperties` — route musí spadnúť do existujúceho error handling (`generateAndCacheAgencyInsights` catch).
- **429 simulácia:** mock `generateDashboardInsights` delay > timeout — očakávaný fallback payload (`78-88`).
- Cron route: smoke na 1 agency — cache row upsert OK.

---

## 4. Čo NEROBIŤ

| Zóna | Prečo |
|------|--------|
| `enterprise-intelligence-store.runEnterprisePipelineAndPersist` | SIDE-EFFECT reťazec (read events → score → write insights) |
| Paralelné `persistDossier` + OpenAI | race na rovnakom lead row |
| Paralelné triage UPDATE bez idempotency key | posledný zápis vyhrá — riziko čiastočného batchu |
| ExecutionGraph modul | až po merateľnom 30 % p95 z quick winov |

---

## 5. Odporúčanie Fázy 2

1. Implementovať QW1 + QW2 v **samostatných PR** po founder GO.
2. Po 7 dňoch logov prepočítať p95; ak **< 30 %** zlepšenie oproti baseline z logov → **STOP** ExecutionGraph.
3. SIDE-EFFECT cron cesty (triage persist, enterprise pipeline) — až po transakčnom návrhu.

**Súvisiaci prompt:** `docs/prompts/cursor-graph-audit-phase1.md`
