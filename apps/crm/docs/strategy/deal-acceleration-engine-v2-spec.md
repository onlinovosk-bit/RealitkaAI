# REVOLIS.AI — Deal Acceleration Engine V2 (špecifikácia)

**Dátum:** 2026-06-04  
**Režim:** návrh / audit — **žiadna implementácia v tomto dokumente**  
**Zdroj pravdy:** existujúci kód v `apps/crm` (leads, cron, dashboard, forecasting)

---

## FÁZA 1 — CURRENT STATE AUDIT

### [System Auditor] Data Model Overview

| Entity | Table / Source | Kľúčové polia (follow-up / priorita) | Poznámka |
|--------|----------------|--------------------------------------|----------|
| Príležitosť / lead | `public.leads` | `id`, `name`, `status`, `score`, `buyer_readiness_score`, `last_contact`, `note`, `source`, `agency_id`, `assigned_agent`, `ai_priority`, `ai_reason`, `ai_triage_at`, `ai_priority_manual_at`, `ai_followup_count`, `last_ai_followup_at`, `created_at`, `updated_at` | **Primárna entita** pre Deal Acceleration |
| AI triáž (W1) | stĺpce na `leads` | `ai_priority` ∈ {Vysoká, Stredná, Nízka}, `ai_reason`, `ai_triage_at` | Cron `lead-ai-triage` — Haiku batch, nie runtime LLM v UI |
| BRI / scoring v2 | `lead_scores` (via `ai-scoring-store`) | `bri_score`, band, risk | `calculateAllLeadScores()` — používa forecasting |
| Úlohy | `tasks` (tasks-store) | `leadId`, `status`, deadline polia | Deal health: overdue open tasks |
| Aktivity | `activities` | via activities-store / events | Počítanie v tenant-health; nie plne zapojené do jedného „dnes“ widgetu |
| Párovanie | `lead_property_matches` | `matchScore`, `leadId` | Boost v `forecasting-store` |
| Odporúčania | recommendations-store | `leadId` | Boost pravdepodobnosti v forecaste |
| Decision ops | `lead_action_scores` | `success_prob`, `expected_revenue` | POST `/api/ai/decision/score-lead` — per-lead, nie denný zoznam |

**Poznámka:** V repozitári nie je samostatná tabuľka `deals` ako v klasickom CRM — pipeline je **`leads.status`** (Nový, Teplý, Horúci, Obhliadka, Ponuka, …).

Migrácia: `20260514120000_architect_workflows_leads_columns.sql` — AI triáž + follow-up meta na `leads`.

---

### [System Auditor] Existing Scoring / Rules

| Mechanizmus | Kde | Čo robí | UI |
|-------------|-----|---------|-----|
| **W1 Haiku triáž** | `api/cron/lead-ai-triage`, `lead-triage-batch.ts` | Batch priorita → `ai_priority` + `ai_reason` | `TodaysTenLeads` — zoradenie podľa `aiPriority` |
| **Heuristika sparse import** | `lead-triage-batch.ts` (`isSparseImportLead`) | Skóre 0 + prázdny kontakt → **Nízka** bez modelu | Po PR #106 |
| **Rule-based NBA** | `executive-signals.ts`, `ai-engine.getNextBestAction` | timing/urgency z `status`, `score`, `last_contact` | `AIPriorityStrip`, `NextBestActionPanel` |
| **Forecast probability** | `forecasting-store.ts` | `stageProbability(status)` × score × tasks × matches | `/forecasting` KPI + deal health |
| **AI scoring store** | `ai-scoring-store.ts`, `/api/scoring/recalculate` | band, riskLevel per lead | `/scoring` stránka |
| **Decision engine** | `/api/ai/decision/score-lead` | revenue / closing window per request | Lead detail + `L99DecisionOpsPanel` |
| **Follow-up sweep** | `api/cron/follow-up-sweep` | stagnujúce leady, LLM draft (env) | Nie ako „dnes kontaktuj“ lista |

**Legacy / mimo scope:** GET `/api/scoring` → 410 Gone (odstránená heuristika SCRAPED).

---

### [System Auditor] Existing Dashboards & Widgets

| Komponent | Súbor | Blízkosť k „Dnes kontaktuj týchto ľudí“ |
|-----------|-------|----------------------------------------|
| **Dnešných 10 (AI priorita)** | `TodaysTenLeads.tsx` | **Najbližšie** — top 10 leadov, `ai_priority`, `ai_reason`, link na lead |
| **AI Priority Strip** | `AIPriorityStrip.tsx` | Top 3 signály — meno, akcia (`getNextBestAction`), timing, confidence |
| **Next Best Action Panel** | `NextBestActionPanel.tsx` | Jedna top akcia z executive signals |
| **Daily Action Panel** | `DailyActionPanel.tsx` | Denné úlohy (iný zdroj) |
| **Priority Leads** | `priority-leads.tsx` | Zoradenie podľa score |
| **Forecast risk strip** | `ForecastRiskStrip.tsx` | Riziká mesiaca z `dealHealth` |
| **Playbook** | `/playbook` | Samostatný modul (plán práce) |

Prázdny stav `AIPriorityStrip`: úprimný text (nie demo mená po cleanup #104).

---

### [System Auditor] Reuse Opportunities

1. **`ai_priority` / `ai_reason` / `ai_triage_at`** — už zapisuje cron; UI len číta a zoradí.
2. **`TodaysTenLeads`** — premenovať / rozšíriť copy na „Dnes kontaktuj“ bez nového layoutu.
3. **`buildExecutiveSignals`** — doplniť `recommendedAction` z `ai_reason` ak existuje (fallback rule-based).
4. **`GET /api/crm/tenant-health`** — smoke gate pred zobrazením (RLS / `auth_user_id`).
5. **`forecasting-store` dealHealth** — overdue tasks + high value no tasks → dôvody rizika.
6. **`OPEN_STATUSES`** — zdieľaný zoznam v cron triáži a follow-up (duplicita v 2 súboroch — kandidát na jeden export, nie nová služba).
7. **Cron infra** — `CRON_SECRET`, Vercel cron; žiadny nový scheduler.

---

### [System Auditor] Gaps

| Gap | Popis |
|-----|--------|
| **Jeden „Dnes kontaktuj“ endpoint** | Chýba `GET /api/deal-acceleration/today` — klient skladá dáta z viacerých fetchov |
| **Jednotná priorita** | Mix: `ai_priority` (SK slová), `score`, `urgency` enum — nie jeden stĺpec High/Med/Low pre UI |
| **Dôvod vždy dátami** | `ai_reason` po triáži áno; strip používa rule timing bez vždy `ai_reason` |
| **Odporúčaná akcia** | `getNextBestAction` generické; nie vždy „zavolať“ vs „email“ z dát |
| **439 importov bez kontextu** | Po triáži Nízka — správne; „horúci“ v UI môže stále čítať `status`/`score` ≠ `ai_priority` |
| **Activities nie v jednom score** | Aktivity existujú, ale nie sú centrálne v jednom dennom rankingu |
| **Žiadny feature flag** | Deal Acceleration V1 by mal mať flag pre rollback |

---

### [System Auditor] Implementation Difficulty Estimate

| Gap | Obtiažnosť | Prečo |
|-----|------------|-------|
| Zjednotený API endpoint „today“ | **Medium** | Query + merge polí z leads/tasks; RLS |
| Prepojenie UI copy + jeden widget | **Low** | Refactor `TodaysTenLeads` + strip |
| Zoradenie podľa ai_priority + score | **Low** | Už čiastočne v `sortForToday` |
| Feature flag | **Low** | Env / existujúci gating pattern |
| Zapojenie activities do ranku | **Medium** | Agregácia + performance |
| Nahradenie 4 scoring ciest jednou | **High** | Produktové rozhodnutie — neodporúčané vo V1 |

---

## FÁZA 2 — NÁVRH DEAL ACCELERATION ENGINE V1

### [Product Strategist] PRODUCT SPEC

#### User Story

Ako **realitný maklér** chcem **na dashboarde vidieť zoznam dnešných priorítnych klientov s dôvodom a odporúčanou akciou**, aby som **vedel urobiť najdôležitejšie follow-upy bez premýšľania** a **nezabudol na leady v CRM**.

#### Business Impact

1. Zvýši sa podiel leadov s follow-upom do 48h po priradení/triáži.
2. Zníži sa počet leadov bez aktivity > 5 dní (follow-up sweep + viditeľnosť).
3. Maklér míňa menej času rozhodovaním „koho volať prvého“.
4. Owner RK vidí využitie importu (439 leadov → `ai_priority`, nie prázdny dashboard).
5. Forecasting a pipeline KPI začnú reflektovať reálne dáta namiesto núl.

#### Success Metrics

| Metrika | Baseline (2026-06-04, Smolko) | Cieľ (90 dní) |
|---------|-------------------------------|---------------|
| % leadov s `ai_triage_at` NOT NULL | 0 % (439 čaká) | ≥ 95 % otvorených |
| % leadov s follow-up do 48h od triáže | *neznáme* — treba event `call_completed` / `last_contact` | z 30 % → 45 % |
| Počet uzavretých (`status` uzavretý) / makléra / mesiac | *neznáme* | +15 % vs. baseline po 2 mesiacoch |
| Leady bez aktivity > 5 dní (open) | vysoké po importe | −30 % |
| Adopcia widgetu (telemetry `priority_strip_view` + klik na lead) | existuje telemetry | ≥ 60 % DAU maklérov s ≥1 klikom/deň |

---

### [Technical Architect] TECHNICAL DESIGN

#### Database changes

| Change | Type | Impact |
|--------|------|--------|
| Žiadne nové tabuľky pre V1 | **no change** | Použiť `leads.ai_*` + existujúce `tasks` |
| Voliteľný index | **new index** (odporúčané) | `(agency_id, status, ai_triage_at)` pre cron/query — rýchlejší „dnes“ |
| `deal_acceleration_snoozed_until` | **new field** (V2) | Nie vo V1 — snooze cez existujúce task alebo manual lock |

**Záver:** V1 **nevyžaduje** povinnú schému okrem možného indexu.

#### Backend / API changes

| Endpoint | Akcia | Logika (bez kódu) |
|----------|-------|-------------------|
| `GET /api/deal-acceleration/today` | **nový** | Auth + RLS: otvorené leady agentúry, `ai_triage_at` alebo `updated_at` dnes, zoradenie: `priorityRank(ai_priority)` desc, `score` desc; limit 10–15; payload: `leadId`, `name`, `priority`, `reason`, `recommendedAction` (mapovanie z `ai_reason` alebo `getNextBestAction`) |
| `GET /api/cron/lead-ai-triage` | existujúci | Po PR #106 + `TRIAGE_AGENCY_ID` backfill |
| `PATCH /api/leads/[id]` | existujúci | Manual override `aiPriority` — už v `TodaysTenLeads` |

#### Frontend changes

| Miesto | Zmena |
|--------|-------|
| `/dashboard` | Sekcia **„Dnes kontaktuj týchto ľudí“** — evolúcia `TodaysTenLeads` (copy + fetch z nového API alebo rovnaký client filter) |
| Polia karty | Meno, priorita (Vysoká/Stredná/Nízka), dôvod (`ai_reason`), akcia (1 veta), link `/leads/[id]` |
| Prázdny stav | „Žiadne priority — spustite synchronizáciu alebo počkajte na nočnú triáž.“ |
| Feature flag | `DEAL_ACCELERATION_V1=1` — fallback na súčasný strip |

#### Risks

| Riziko | Likelihood | Impact | Mitigácia |
|--------|------------|--------|-----------|
| RLS 0 leadov (auth_user_id) | Med | High | `linkProfileToAuthUser` + tenant-health banner |
| Cron nestihne 439 leadov | Low | Med | `TRIAGE_LEAD_LIMIT=500`, viac behov |
| UI „horúci“ ≠ `ai_priority` | Med | Med | Dokumentácia + postupná align `status` filter |
| Query performance | Low | Med | Index, limit 15 |
| Kolízia s 4 scoring cestami | Med | Low | V1 len číta `ai_priority`, nemení BRI/decision |
| Adoption — maklér ignoruje widget | Med | High | 3 položky max, push ranný brief |

#### Rollback plan

1. Vypnúť `DEAL_ACCELERATION_V1` env → dashboard zobrazí legacy `TodaysTenLeads` / strip.
2. Cron triáž: odstrániť `TRIAGE_AGENCY_ID` alebo vypnúť cron v `vercel.json`.
3. DB: `ai_*` stĺpce ostávajú — rollback UI/API bez migrácie.
4. Ak nový endpoint: revert PR — dashboard volá starý client-only sort.

---

## FÁZA 3 — ROI ANALYSIS

### [Impact Analyst] Dimenzie (1–5)

| Dimenzia | Skóre | Komentár |
|----------|-------|----------|
| Frequency | **5** | Každý pracovný deň |
| Pain | **4** | Import 439 bez priorít bol kritický |
| Revenue Impact | **4** | Priamy vplyv na follow-up → obchody |
| Adoption | **4** | Widget na existujúcom dashboarde |
| Moat | **3** | Kombinácia triáže + CRM dát — kopírovateľné |
| Complexity | **2** | V1 = reuse + tenký API + copy |

**ValueScore** = 5 + 4 + 4 + 4 + 3 = **20**  
**EffortScore** = **2**  
**ROI_score** = 20 / 2 = **10**

V rámci cieľa „zvýšiť uzavreté obchody“ je **Deal Acceleration V1 TOP priorita** oproti novým modulom nad prázdnym externým feedom (Plánovaná stavba, recruiting pred `portal_listings`).

#### Alternatíva s vyšším ROI pri nulovom úsilí (už rozbehnuté)

**„Triáž + tenant smoke“** (PR #106, backfill cron) — ROI **vyššie v krátkom horizonte**, lebo bez nového UI okamžite naplní `ai_priority` a KPI. Deal Acceleration V1 je **krok 2** (prezentácia toho istého v jednom „Dnes kontaktuj“).

---

## FÁZA 4 — IMPLEMENTATION PLAN

### [Implementation Planner] Kroky v poradí

1. **Merge + deploy PR #106** — migrácia `imported→Nový`, cron, heuristika.
2. **Vercel env** — `TRIAGE_AGENCY_ID`, `TRIAGE_LEAD_LIMIT=500`; spustiť cron; overiť SQL `ai_triage_at`.
3. **Staging smoke** — `docs/qa/staging-smoke-smolko-triage-2026-06-04.md`.
4. **Audit UI** — kde ešte UI číta len `score`/`status` pre „horúci“; zoznam súborov.
5. **Navrhnúť `GET /api/deal-acceleration/today`** — špec schválený → implementačný PR.
6. **Dashboard** — premenovať blok, jeden fetch, feature flag.
7. **Telemetry** — `deal_acceleration_view`, `deal_acceleration_click_lead`.
8. **Pilot** — 1 RK (Smolko), 2 týždne, merať metriky.
9. **Rozhodnutie V2** — activities v ranku, snooze, push notifikácie.

### Estimated LOC (implementácia po schválení)

| Oblasť | LOC (odhad) |
|--------|-------------|
| API route + typy | 80–120 |
| Frontend widget refactor | 60–100 |
| Index migrácia | 10–20 |
| Testy | 80–120 |
| **Spolu** | **230–360** |

### Estimated Hours

| Rola | Hodiny |
|------|--------|
| Backend | 4–6 |
| Frontend | 3–5 |
| QA / smoke | 3–4 |
| Rollout + pilot | 2–3 |
| **Spolu** | **12–18** |

### Risks & Mitigations (zhrnutie)

- **RLS 0** → tenant-health + link profile (už v produkcii).
- **Prázdne AI dôvody** → najprv cron backfill (#106).
- **Feature theater** → žiadny nový LLM runtime vo V1; len prezentácia existujúcich polí.
- **Rollback** → feature flag + cron off.

---

## Súvis s aktuálnym backlogom

| Položka | Vzťah k Deal Acceleration V1 |
|---------|------------------------------|
| PR #106 triáž/backfill | **Predpoklad** — naplní `ai_priority` |
| PR #105 forecasting demo | Nezávislé; KPI potom rastú z leadov |
| PR #104 UI cleanup | Nezávislé |
| Recruiting brief | **Po** `portal_listings` ingest — nie pred Deal Acceleration |
| Plánovaná stavba / Bod zlomu | Roadmap „čoskoro“ — verejné dáta post-feed |

---

*Schválením tohto dokumentu otvoríš implementačný PR (kód). Tento beh neobsahuje migrácie ani deploy do produkcie.*
