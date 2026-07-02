# Revolis.AI — READ-ONLY audit funkčnosti (CRM + marketing)

**Dátum:** 2026-06-03  
**Typ:** L99 evidence-based feature audit (read-only, bez opráv kódu)  
**Scope:** `apps/crm` (primárne), `apps/marketing` (cross-check cenníka a sľubov)  
**Zdroj behu:** agent audit 967c1ff1 (parent session 7ba35d4b)

Metodika: sled dátového toku **UI → API → lib/service → DB/externé**, klasifikácia podľa dôkazu v kóde. Pri neistote **PARTIAL**, nie LIVE.

Legenda: **LIVE** | **PARTIAL** | **ATRAPA** | **ROZBITÉ** | **NEPOSTAVENÉ**

Signály ATRAPA: hardcoded returns, mock data, `leads_demo`, sample tabuľky, TODO/FIXME, vypnuté feature flags, prázdny catch, UI limity namiesto reálnych dotazov.

---

## 1. Hlavná tabuľka (9 prioritných + rozšírenie CRM)

| Feature | Stav | Dôkaz (súbor:riadok) | Čo chýba do LIVE | Riziko |
|--------|------|----------------------|------------------|--------|
| **Leads Engine / AI lead generation** | **NEPOSTAVENÉ** (produkt) + **ATRAPA** (akvizícia) | Cenník bez kódu modulu: `apps/crm/src/lib/program-tier-pricing.ts:35`; žiadna route/capability „leadsEngine“. Demo scraping 1 hardcoded lead: `apps/crm/src/app/api/scrape/route.ts:11-13`. Meta lookalike default `leads_demo`: `apps/crm/src/app/api/meta/lookalike/route.ts:15,35`. UI volá lookalike **bez** Bearer cron secret: `apps/crm/src/components/marketing/AcquisitionHub.tsx:684-686` vs auth `meta/lookalike/route.ts:8-10`. Odhad = deterministická mapa, nie trh: `apps/crm/src/app/api/demo/estimate/route.ts:42-46` | Samostatný modul Leads Engine (API, gating, ingest z portálov/Meta z CRM leadov, nie `leads_demo`), oprava auth pre Digital Twin | **Vysoké** — add-on 79 € bez implementácie; tvrdenie „generuje leady“ vs demo/1 fake scrape |
| **AI triage / scoring (produktovo)** | **PARTIAL** | Cron triáž: DB `leads` → Haiku batch → update `ai_priority`: `apps/crm/src/app/api/cron/lead-ai-triage/route.ts:20-56`, `apps/crm/src/lib/ai/lead-triage-batch.ts:44-54`. UI scoring 2.0: `apps/crm/src/app/(dashboard)/scoring/page.tsx:37-40`, `apps/crm/src/lib/ai-scoring-store.ts:23-41`. **Legacy ATRAPA** route: heuristika `status=SCRAPED`, nie scoring-v2: `apps/crm/src/app/api/scoring/route.ts:10-30` | Jednotný scoring endpoint; vypnúť/odstrániť legacy `/api/scoring`; BRI `lead_scores` vs `leads.score` konzistencia | **Stredné** — dve scoring cesty; marketing „AI scoring“ vs free-tier obmedzenie `AiInsightsPanel.tsx:61` |
| **Market Intelligence** | **PARTIAL** | Capability gate Market Vision+: `apps/crm/src/lib/license/capability-registry.ts:92-99`. RPC report: `apps/crm/src/app/api/reports/generate-developer-insights/route.ts:21-48`. Heatmap z CRM leadov/nehnuteľností (pseudo GPS): `apps/crm/src/lib/analytics/demand-moat.ts:35-55`, `market-density.ts:1-2`. **Seed fallback** neighborhood: `apps/crm/src/app/api/neighborhood-watch/alerts/route.ts:4-17,35-52` | Reálne trhové feedy (nie seed); `demand_signals` napojené na UI; add-on 99 € v `program-tier-pricing.ts:36` bez `requireFeature` | **Vysoké** — cenník add-on vs tier `canUseMarketIntel`; demo seed v akvizícii |
| **Protocol AI** | **PARTIAL** + **ATRAPA** | Cenník: `program-tier-pricing.ts:37`. UI L99 hub + IntelBrief: `apps/crm/src/app/(dashboard)/l99-hub/page.tsx:148,256`. Strategic alerts **SEED** ak DB prázdna: `apps/crm/src/app/api/strategic-alerts/route.ts:14-44`. Competition map **DEFAULT_SECTORS**: `apps/crm/src/components/l99/CompetitionMap.tsx:8-14,22-23`. Predator moduly **bez onClick/API**: `apps/crm/src/components/dashboard/PredatorModules.tsx:69-78` | Skutočný competition ingest; Protocol AI ≠ len tier rename; napojenie `competitor-watch` na DB | **Vysoké** — marketing „Protocol AI 149 €“ vs statické sektory/seed alerty |
| **Active Force Calls** (add-on 59 €) | **PARTIAL** | Cenník: `program-tier-pricing.ts:38`, `terms/page.tsx:90`. **Skutočná** analýza hovoru: `apps/crm/src/lib/ai/call-analysis.ts:1-7,31-39`, API `apps/crm/src/app/api/ai/call/analyze/route.ts:21-48`, UI `/call-analyzer` v `navigation.ts:57`. Tier Active Force = radar/forecast (`capability-registry.ts:83-90`), **nie** samostatný „Calls“ modul | Billing/gating pre add-on „Active Force Calls“; transcribe pipeline end-to-end smoke | **Stredné** — zámena tier „Active Force“ (99 €) vs add-on „Calls“ (59 €) |
| **Stealth / Recruiter** | **PARTIAL** | DB migrácia: `apps/crm/supabase/migrations/20260529120000_stealth_recruiter_prospects.sql`. Scan DB + demo: `apps/crm/src/app/api/stealth-recruiter/scan/route.ts:127-146,148-301,304-309`. Cron ingest Prešov: `apps/crm/src/app/api/cron/stealth-recruiter-ingest/route.ts:5-12`. Demo flag: `scan-filters.ts:43-44`. UI default `generateNew: false`: `AcquisitionHub.tsx:791` | Cron **nie** v `vercel.json` (len triáž/brief v `apps/crm/vercel.json:16-22`); produkcia bez demo fallback | **Stredné** — demo režim; PR #72 stav podľa docs |
| **Morning Brief** | **PARTIAL** | Pipeline gather→AI→DB→email: `assemble.ts:27-92`, `gather.ts:39-169`, cron `apps/crm/src/app/api/cron/morning-brief/route.ts:10-48`, `vercel.json:13-14`. Závislosť na `lead_scores`/events | **Žiadna** dashboard route s `BriefSettings` (`grep` — komponent bez `app/` page); Resend/env smoke; `weeklyRevForecast: null` `gather.ts:175` | **Stredné** — backend existuje, UX nastavení chýba v app routes |
| **Arbitrage** | **PARTIAL** + **ATRAPA** | **LIVE engine** cron+scan: `apps/crm/src/lib/arbitrage/scan.ts:20-74`, `apps/crm/src/app/api/cron/arbitrage-scan/route.ts:3-8` — cron **nie** v `vercel.json`. API matches DB: `apps/crm/src/app/api/arbitrage/route.ts:34`. **ATRAPA** UI akvizícia: `useLive: false` → `DEMO_CANDIDATES`: `AcquisitionHub.tsx:594-597`, `arbitrage/analyze/route.ts:7-37,131-135` | Zapnúť `arbitrage-scan` cron; dashboard `ArbitrageDashboard` nie je v `app/` (len komponent); akvizícia → live scan | **Vysoké** — používateľ vidí fiktívnych Kováč/Šimko |
| **Integrity Monitor** | **PARTIAL** + **ATRAPA** (UI) | Backend pri export eventoch: `integrity-monitor.ts:29-67`, volanie `apps/crm/src/app/api/events/route.ts:8,19-20`. **UI** len statický copy: `integrity/page.tsx:3-24` — žiadny fetch `integrity_alerts` | Stránka s alertami, audit log, owner notifikácie v app | **Stredné** — backend alert existuje, produkt „monitor“ je prázdny shell |
| Leads / CRM core | **PARTIAL** | `listLeads` → Supabase, fallback `mockLeads`: `leads-store.ts:785-819`. Inbound webhook → `processInboundLead`: `webhooks/inbound-lead/route.ts:36-46` | Odstrániť tichý mock fallback v prod; RLS smoke | Stredné |
| Matching | **LIVE** (s výhradou) | `matching/recalculate/route.ts:20-28` → `matching-store` | Prázdny store v novom tenante | Nízke |
| Recommendations | **PARTIAL** | Engine `recommendations-engine.ts`; persist `recommendations-store.ts` | DB prázdna bez cron | Nízke |
| Forecasting | **PARTIAL** | `forecasting-store.ts` + `ai-scoring-store`; gate `canViewForecast` | Závislosť na dátach a deploy | Nízke |
| Dashboard AI insights | **ATRAPA** | Hardcoded SK text + `slice(0,3)` lead IDs: `dashboard/insights/route.ts:34-42` | LLM + `summary` z reálnych dát | **Vysoké** — pôvod „last 3“ narácia |
| Competitor Watch agent | **ATRAPA** | Hardcoded `priceDrops` + Slack: `agents/competitor-watch/route.ts:12-16` | Query price history | Stredné |
| Realvia / import | **PARTIAL** | `webhooks/realvia`, `cron/realvia-process` | Env + queue smoke | Stredné |
| Outreach AI | **PARTIAL** | `outreach-store.ts` + `requireFeature("outreach")` | OpenAI keys, send path | Stredné |

**K „last 3 contacts“ ako lead generation:** V repozitári **nie je** API, ktoré by vracalo „posledné 3 kontakty“ ako **vygenerované leady**. Najbližšie dôkazy: hardcoded dashboard insights s `topHotLeads.slice(0, 3)` (`dashboard/insights/route.ts:42`), UI limity `.slice(0, 3)` (`DailyActionPanel.tsx:60,78`, `LeadsHotStrip.tsx:19`), onboarding focus `recent-contacts` (`focus-config.ts:8`). To sú **prioritizačné/UI limity**, nie Leads Engine.

---

## 2. ATRAPA funkcie aj v marketing / pricing (najvyššie riziko)

| Marketing sľub | CRM realita | Dôkaz marketing | Dôkaz CRM |
|----------------|-------------|-----------------|-----------|
| **AI Lead Scoring** (statické mená/skóre) | LIVE scoring stránka + mock fallback leads | `apps/marketing/app/page.tsx:288-304` | `scoring/page.tsx:37-40`; fallback `leads-store.ts:818-819` |
| **24/7 AI Response** (funnel 47/47/12) | Nie je jeden „Response Engine“ modul v CRM API | `page.tsx:315-333` | — |
| **Protocol AI** plán 149 € | Tier Protocol Authority + ATRAPA heatmap/seed | `page.tsx:549-571` | `CompetitionMap.tsx:8-14`; `strategic-alerts/route.ts:14-44` |
| **Active Force** v plánoch | Tier `pro` / radar — iný produkt ako „Active Force Calls“ | `page.tsx:536,560` | `capability-registry.ts:29-35`; add-on `program-tier-pricing.ts:38` |
| Moduly Leads Engine, MI, Protocol | Text bez technického mapovania | `apps/marketing/app/zakulisie/[token]/page.tsx:271` | `program-tier-pricing.ts:35-37` — bez feature gates |
| **Stealth Bypass** (FeatureGrid CRM marketing) | Stealth scan s demo | `apps/crm/src/components/marketing/FeatureGrid.tsx:42` | `stealth-recruiter/scan/route.ts:12-67,304-309` |
| **+34 % konverzia** (číslo) | Nie overené v kóde | `page.tsx:456` | — |

**CRM public terms** duplikujú add-ony (Leads Engine 79 €, …): `apps/crm/src/app/(public)/terms/page.tsx:87-90` — rovnaké riziko ako marketing.

---

## 3. Odhad práce do LIVE (ATRAPA / NEPOSTAVENÉ) — T-shirt

| Feature | Odhad | Poznámka |
|---------|-------|----------|
| **Leads Engine** (produkt end-to-end) | **L (80–120 h)** | Modul, ingest, gating, Meta z CRM, odstrániť `leads_demo` z user path, QA+legal |
| **Dashboard insights** (namiesto hardcoded) | **M (24–40 h)** | `dashboard/insights/route.ts` → LLM + summary API |
| **Arbitrage akvizícia UI** | **S (8–16 h)** | `useLive: true`, prepojenie na `/api/arbitrage` + cron v Vercel |
| **Arbitrage engine ops** | **M (16–24 h)** | Cron, portal_listings feed, monitoring |
| **Protocol AI / Competition** | **L (60–90 h)** | Skutočný competitor pipeline, nahradiť `DEFAULT_SECTORS` + `SEED_ALERTS` |
| **Market Intelligence add-on** | **M (32–48 h)** | Billing gate, živé neighborhood/trh, nie seed |
| **Integrity Monitor UI** | **M (24–32 h)** | Stránka + `integrity_alerts` + audit |
| **Morning Brief UX** | **S (12–20 h)** | Settings page, onboarding enable |
| **Stealth Recruiter prod** | **M (24–40 h)** | Cron deploy, `STEALTH_RECRUITER_DEMO_MODE=false`, multi-region |
| **Meta Digital Twin** | **S (8–12 h)** | Session auth alebo server action; odstrániť CRON-only mismatch |
| **Legacy `/api/scoring` + `/api/scrape`** | **XS (4–8 h)** | Deprecate alebo prepojiť na v2 |
| **PredatorModules CTAs** | **S (16–24 h)** | Routy na ghostwriter / stealth / arbitrage |
| **Marketing copy sync** | **S (8–16 h)** | Oddeliť LIVE vs roadmap na `page.tsx` |

---

## 4. Stredný prehľad ostatného CRM povrchu

| Oblasť | Stav | Kľúčový dôkaz |
|--------|------|----------------|
| `/leads`, `/pipeline`, `/properties` | **PARTIAL** | Supabase stores + mock fallback |
| `/matching`, `/recommendations` | **PARTIAL / LIVE** | Recalculate API + stores |
| `/forecasting` | **PARTIAL** | Tier gate `canViewForecast` |
| `/revolis-ai` | **PARTIAL** | Heatmap z CRM; feed **mock** `getAiActivityFeedSeed` `revolis-ai/page.tsx:13` |
| `/l99-hub` | **PARTIAL** | Mix tier modulov + ATRAPA competition/seed |
| `/akvizieia/*` | **ATRAPA / PARTIAL** | AcquisitionHub demo API; ghostwriter **LIVE** (`/api/ghostwriter`) |
| `/call-analyzer` | **PARTIAL → blízko LIVE** | Claude analýza `call-analysis.ts` |
| Cron ops | **PARTIAL** | `vercel.json` len pulse, bri, morning-brief, triage, follow-up — **chýba** arbitrage, stealth, price-trail |
| `feature-gating.ts` | **PARTIAL** | Žiadne add-on kľúče `leadsEngine` / `protocolAI` |

---

## 5. Záver auditu (L99)

- **Živé jadro:** lead CRUD (Supabase), AI triáž cron, AI scoring 2.0 stránka, call analyzer, morning brief backend, arbitrage scan kód, stealth DB+cron (ak nasadený), inbound webhook.
- **Najväčšia medzera obchod ↔ produkt:** add-ony **Leads Engine**, **Market Intelligence**, **Protocol AI**, **Active Force Calls** sú v cenníku (`program-tier-pricing.ts`, marketing `page.tsx`, VOP), ale **nemajú** jednoznačnú, oddelenú produktovú implementáciu s rovnakým názvom.
- **„Last 3“:** potvrdené ako **UI/brief limity a hardcoded insights**, nie ako Leads Engine API — tvrdenie treba upresniť pri root-cause.

**Čo nebolo v scope tohto read-only behu:** runtime smoke na Vercel/Supabase, obsah produkčných tabuliek, E2E `tests/smoke.spec.ts`.

**Odporúčaný ďalší krok:** prioritizovaný backlog PR (1 PR = 1 logická zmena podľa L99) podľa rizika v sekcii 2.
