# Revolis Acquisition OS v2.2 — Final Locked for Stage 0 Implementation

> **Status:** FINAL LOCKED — no further AI review. Approved for Stage 0 coding.  
> **Scope:** Google Ads V1 → Meta V1.5 → Multi-provider V2  
> **Target:** 1 → 10 → 50 → 100 → 1 000 realitných kancelárií  
> **Date:** 2026-08-09  
> **Locked by:** CTO + Product + AI Architecture review  
> **Next step:** Stage 0 implementation (this week). No more blueprint revisions.

---

## 0. Executive Decisions (Locked — v2.2 Final)

| # | Rozhodnutie | Dôvod |
|---|-------------|-------|
| 1 | **Toprank nie je runtime závislosť.** | Použijeme ho ako research oracle / prompt knižnicu. Všetky operácie idú cez oficiálne Google Ads API. |
| 2 | **Google Ads účet patrí RK.** Revolis má iba management access. | Klient vlastní billing, históriu a môže odísť. Nižšie právne riziko. |
| 3 | **MCC hierarchia:** ROOT MCC → SUB-MCC (krajina) → CLIENT. | Organizačná a operačná hierarchia. **Limity aktívnych účtov sa posudzujú na top-level manager úrovni** (pod $10k/mes = 50 aktívnych; $10k–$500k = 2 500; nad $500k limit sa neuplatňuje). Celkový limit non-manager účtov je 85 000. Sub-MCC nie je nástroj na obídenie limitu. |
| 4 | **Developer token = 1 per Revolis.** **Backend credentials: preferovaný service account** pre MCC-based access. Fallback: OAuth per-client pre RK s vlastným setupom. | Service account = jedna identita, žiadne 1 000 refresh tokenov, headless/automated workflows. Google odporúča service account pre organizačný prístup k MCC hierarchii. |
| 5 | **Offline conversions cez Data Manager API v1.3.** Async model: `IngestEvents` → `requestId` → `RetrieveRequestStatus` polling + exponential backoff. | Od 15.6.2026 nové implementácie nesmú používať legacy UploadClickConversion. Žiadny webhook notification pre Data Manager v Stage 0 — iba scheduled polling. |
| 6 | **AI autopilot = tiered.** LOW risk = auto (po policy schválení). MEDIUM = AI proposal + human approval. HIGH = mandatory human. | Bez toho 1 000 RK = operatívny kolaps. |
| 7 | **Deterministický engine first, LLM až potom.** | CPL, CPA, trend, variance, budget pacing sa počítajú klasicky. LLM dostane iba „zaujímavé“ prípady. |
| 8 | **Zdroj pravdy = Revolis CRM.** GA4 = analytics layer. Google Ads = execution layer. | Zabráni sa situácii, kde analytics tool je business databáza. |
| 9 | **Test account ≠ production conversion test.** Google test accounts nemajú serving data, billing a **nepodporujú conversion uploads**. Stage 0 = test account pre API/sync. Stage 1 = malý produkčný účet pre end-to-end conversion loop. | Test account neoverí offline conversion flow. Pre E2E loop potrebujeme reálny účet s reálnym gclid. |
| 10 | **Seller Intent Score = Heuristic v1.** Nie production truth. | Skóre je začiatok. Neskôr sa kalibruje na základe historických outcomes. |
| 11 | **Rate limiting = konfigurovateľný parameter.** `GOOGLE_ADS_RATE_LIMIT_PER_TENANT` sa nastaví podľa reálneho API limitu a typu operácie. | Google má vlastný quota model — nefixujeme vymyslené číslo do blueprintu. |

---

## 1. Product Definition

### 1.1 North Star
> Revolis vie, ktorá akvizičná aktivita vytvára realitný obchod, a kontinuálne zlepšuje akvizičný stroj pomocou vlastných CRM výsledkov.

### 1.2 Primary KPI
**Cost per qualified seller opportunity** → neskôr **Cost per signed mandate**.

### 1.3 Conversion Ladder (Locked)
```
LEVEL 1: lead
LEVEL 2: contacted
LEVEL 3: qualified
LEVEL 4: appointment
LEVEL 5: mandate_signed
LEVEL 6: sold
```

**Pravidlo:** Nový klient začína optimalizovať na LEVEL 3 (qualified). Až pri dostatočnom volume sa posúva na LEVEL 4, potom 5.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    REVOLIS ACQUISITION OS                     │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  Command    │  │  Analytics   │  │   Unit Economics    │ │
│  │  Center     │  │  Engine      │  │   Engine            │ │
│  │  (Internal) │  │  (Determin.) │  │   (ROI/Attribution) │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘ │
│         │                │                     │            │
│  ┌──────▼────────────────▼─────────────────────▼──────────┐ │
│  │              Acquisition Orchestrator                  │ │
│  │  (Tenant Context + Feature Flags + Policy Engine)      │ │
│  └──────┬────────────────┬────────────────┬────────────────┘ │
│         │                │                │                 │
│  ┌──────▼─────┐   ┌──────▼──────┐  ┌─────▼──────┐         │
│  │   Google   │   │    Meta     │  │ Microsoft  │         │
│  │   Adapter  │   │   Adapter   │  │  Adapter   │         │
│  └──────┬─────┘   └──────┬──────┘  └─────┬──────┘         │
└─────────┼────────────────┼───────────────┼────────────────┘
          │                │               │
    ┌─────▼─────┐    ┌─────▼─────┐   ┌─────▼─────┐
    │ Google    │    │  Meta     │   │ Microsoft │
    │ Ads API   │    │  Ads API  │   │  Ads API  │
    │ Data Mgr  │    │           │   │           │
    └───────────┘    └───────────┘   └───────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Acquisition Event Ledger                   │
│         (Immutable, idempotent, tenant-scoped)                │
└─────────────────────────────────────────────────────────────┘
          │
    ┌─────▼────────────────────────────────────────┐
    │              Revolis CRM                     │
    │  Lead → Contacted → Qualified → Appointment   │
    │         ↓                                    │
    │  Seller Intent Score (Heuristic v1)         │
    │         ↓                                    │
    │  Maklér + Follow-up + SLA Monitoring        │
    │         ↓                                    │
    │  Business Outcome (Mandate / Sold)           │
    └──────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│              Offline Conversion Feedback Loop                 │
│   CRM outcome → Conversion Router → Data Manager API → Ads    │
│   (async: requestId → RetrieveRequestStatus polling →         │
│    UPLOADED / FAILED / RETRY)                                 │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│              Acquisition Knowledge Graph                      │
│   (Anonymized cross-tenant patterns, NOT raw PII)             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Multi-Tenant Security Model

### 3.1 MCC Hierarchy
```
REVOLIS ROOT MCC (SK)
    │
    ├── SK SUB-MCC
    │     ├── RK001 (Customer ID: 123-456-7890)
    │     ├── RK002 (Customer ID: 234-567-8901)
    │     └── ...
    │
    ├── CZ SUB-MCC
    │     ├── RK101
    │     └── ...
    │
    └── [future markets]
```

**Limit pravidlá (Google Ads Help):**
- Maximálne 85 000 non-manager účtov pod manager account.
- Limit **aktívnych** účtov závisí od najvyššieho mesačného spendu za posledných 12 mesiacov na **top-level manager účte**:
  - Pod $10k → 50 aktívnych
  - $10k – <$500k → 2 500 aktívnych
  - Nad $500k → limit sa neuplatňuje
- Google pravidelne prehodnocuje účty.

### 3.2 Tenant Isolation Rules
1. **Database:** Každý SELECT/INSERT/UPDATE musí obsahovať `agency_id`. RLS policies v Supabase.
2. **Composite Tenant Scoping:** Všetky tabuľky, ktoré referencujú `acquisition_account_id`, musia mať composite constraint `(agency_id, acquisition_account_id)`, aby sa zabránilo mismatchu `agency A + account B`.
3. **API:** Žiaden endpoint nesmie prijať `customer_id` z client payload. Musí byť resolved z `agency_id` v authenticated context.
4. **LLM:** LLM nikdy nedostane unrestricted mutation tool. Dostáva `propose_change(agency_id, ...)` a `get_account_metrics(agency_id)`.
5. **Queue:** Každý job má `tenant_id`. Worker spustí operáciu v tenant contexte.
6. **Credentials:** OAuth tokens / service account keys encrypted at rest (KMS). Nikdy v logoch, nikdy v promptoch.

### 3.3 Core Tables

#### `acquisition_accounts`
```sql
id uuid PRIMARY KEY,
agency_id uuid NOT NULL REFERENCES agencies(id),
provider TEXT NOT NULL CHECK (provider IN ('GOOGLE','META','MICROSOFT')),
manager_customer_id TEXT,           -- MCC / sub-MCC
customer_id TEXT NOT NULL,            -- client account
sub_manager_customer_id TEXT,         -- optional sub-MCC
 currency_code TEXT,
 timezone TEXT,
 status TEXT DEFAULT 'PENDING',        -- PENDING, ACTIVE, SYNCING, ERROR, DISCONNECTED
 connected_at TIMESTAMPTZ,
 last_sync_at TIMESTAMPTZ,
 credential_ref TEXT NOT NULL,         -- encrypted pointer to vault
 credential_type TEXT DEFAULT 'SERVICE_ACCOUNT', -- SERVICE_ACCOUNT, OAUTH_USER, OAUTH_PER_CLIENT
 billing_owner TEXT DEFAULT 'CLIENT', -- CLIENT or REVOLIS
 consolidated_billing BOOLEAN DEFAULT FALSE,
 created_at TIMESTAMPTZ DEFAULT now(),
 UNIQUE(provider, customer_id)
```

#### `acquisition_campaigns`
```sql
id uuid PRIMARY KEY,
agency_id uuid NOT NULL,
acquisition_account_id uuid NOT NULL,
provider TEXT NOT NULL,
provider_campaign_id TEXT NOT NULL,
name TEXT,
status TEXT,
objective TEXT,
daily_budget NUMERIC,
currency TEXT,
bidding_strategy TEXT,
last_synced_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ DEFAULT now(),
 -- Composite tenant scoping
 FOREIGN KEY (agency_id, acquisition_account_id) 
   REFERENCES acquisition_accounts(agency_id, id),
 UNIQUE(provider, provider_campaign_id)
```

#### `acquisition_events` (Immutable Ledger)
```sql
id uuid PRIMARY KEY,
agency_id uuid NOT NULL,
lead_id uuid REFERENCES leads(id),
provider TEXT NOT NULL,
event_type TEXT NOT NULL,             -- lead.form_submitted, lead.qualified, lead.mandate_signed, campaign.budget_changed, ...
provider_event_id TEXT,
occurred_at TIMESTAMPTZ,
received_at TIMESTAMPTZ DEFAULT now(),
payload_hash TEXT,                    -- SHA-256 for idempotency
attribution_id TEXT,                  -- gclid, fbclid, msclkid
processing_status TEXT DEFAULT 'PENDING', -- PENDING, PROCESSED, ERROR, RETRY
error_code TEXT,
processed_at TIMESTAMPTZ,
metadata JSONB,
 -- Composite unique: per tenant, per provider, per event
 UNIQUE(agency_id, provider, provider_event_id, event_type)
```

**Poznámka k idempotencii:** Pre Google Lead Form je `provider_event_id = lead_id` (Google uvádza, že `lead_id` je unikátny identifikátor leadu a má sa používať na deduplikáciu).

#### `acquisition_conversions`
```sql
id uuid PRIMARY KEY,
agency_id uuid NOT NULL,
lead_id uuid NOT NULL,
conversion_type TEXT NOT NULL,        -- qualified, appointment, mandate_signed, sold
value NUMERIC,
currency TEXT,
occurred_at TIMESTAMPTZ,
google_click_id TEXT,
meta_event_id TEXT,
microsoft_click_id TEXT,
upload_status TEXT DEFAULT 'PENDING', -- PENDING, REQUESTED, UPLOADED, FAILED, RETRY
uploaded_at TIMESTAMPTZ,
data_manager_request_id TEXT,         -- async request ID from Data Manager API
diagnostic_code TEXT,
conversion_action TEXT,               -- maps to Google Ads conversion action
enhanced_conversion_data JSONB,       -- hashed email, phone for Data Manager API
retry_count INT DEFAULT 0,
 created_at TIMESTAMPTZ DEFAULT now(),
 FOREIGN KEY (agency_id, lead_id) REFERENCES leads(agency_id, id)
```

#### `acquisition_change_proposals`
```sql
id uuid PRIMARY KEY,
agency_id uuid NOT NULL,
provider TEXT NOT NULL,
account_id uuid NOT NULL,
change_type TEXT NOT NULL,            -- BUDGET_ADJUST, BID_ADJUST, NEGATIVE_KEYWORD, RSA_REFRESH, PAUSE_KEYWORD, ...
target_resource TEXT,                 -- campaign_id, ad_group_id, criterion_id
before_state JSONB,
proposed_state JSONB,
reason TEXT,
expected_impact JSONB,                -- { cpl_change: -12%, estimated_savings: 45.00 }
risk_score INT CHECK (risk_score BETWEEN 1 AND 100),
auto_risk_class TEXT,                 -- LOW, MEDIUM, HIGH (computed by policy engine)
created_by TEXT NOT NULL,             -- user_id or agent_id
status TEXT DEFAULT 'DRAFT',          -- DRAFT, REVIEW, APPROVED, REJECTED, EXECUTING, EXECUTED, ROLLED_BACK
approved_by uuid REFERENCES users(id),
approved_at TIMESTAMPTZ,
executed_at TIMESTAMPTZ,
execution_result JSONB,
rollback_state JSONB,
 created_at TIMESTAMPTZ DEFAULT now(),
 FOREIGN KEY (agency_id, account_id) REFERENCES acquisition_accounts(agency_id, id)
```

#### `acquisition_experiments`
```sql
id uuid PRIMARY KEY,
agency_id uuid NOT NULL,
provider TEXT NOT NULL,
campaign_id uuid,
hypothesis TEXT NOT NULL,
control_definition JSONB,
treatment_definition JSONB,
start_at TIMESTAMPTZ,
end_at TIMESTAMPTZ,
primary_metric TEXT,                  -- qualified_cpa, mandate_cpa, cpl
secondary_metrics JSONB,
status TEXT DEFAULT 'DRAFT',          -- DRAFT, RUNNING, PAUSED, COMPLETED
winner TEXT,                          -- CONTROL, TREATMENT, INCONCLUSIVE
decision_reason TEXT,
 created_at TIMESTAMPTZ DEFAULT now(),
 FOREIGN KEY (agency_id, campaign_id) REFERENCES acquisition_campaigns(agency_id, id)
```

#### `seller_intent_scores`
```sql
id uuid PRIMARY KEY,
lead_id uuid NOT NULL UNIQUE,
agency_id uuid NOT NULL,
score INT CHECK (score BETWEEN 0 AND 100),
version TEXT DEFAULT 'heuristic_v1',  -- heuristic_v1, calibrated_v2, model_v3
signals JSONB,                        -- { valuation_request: +15, phone_provided: +10, urgency_3m: +20, ... }
reasoning TEXT,                       -- explainable: "+20 valuation request, -5 no address"
calculated_at TIMESTAMPTZ DEFAULT now(),
 FOREIGN KEY (agency_id, lead_id) REFERENCES leads(agency_id, id)
```

**Poznámka:** `version = 'heuristic_v1'` explicitne označuje, že skóre je začiatok. Neskôr sa kalibruje na základe historických outcomes.

#### `acquisition_learning_patterns` (Anonymized)
```sql
id uuid PRIMARY KEY,
pattern_type TEXT,                    -- keyword_angle, geo_performance, creative_type, landing_variant
segment TEXT,                         -- seller_valuation, buyer_inquiry, ...
geography TEXT,                       -- bratislava, kosice, praha, ...
campaign_type TEXT,
hypothesis TEXT,
outcome TEXT,                         -- WIN, LOSS, INCONCLUSIVE
confidence NUMERIC,
sample_size INT,
aggregated_metrics JSONB,             -- avg_cpl, avg_mandate_cpa, conversion_rate
 created_at TIMESTAMPTZ DEFAULT now()
```

---

## 4. API Surface (V1)

### 4.1 Connection & Sync
```
POST /api/acquisition/google/connect          -- OAuth flow start
GET  /api/acquisition/google/accounts         -- list linked accounts
POST /api/acquisition/google/sync             -- trigger manual sync
GET  /api/acquisition/google/sync-status      -- current sync state
```

### 4.2 Campaigns & Read-Only
```
GET  /api/acquisition/campaigns               -- tenant-scoped
GET  /api/acquisition/campaigns/:id
GET  /api/acquisition/campaigns/:id/metrics
GET  /api/acquisition/search-terms            -- with spend/conversion filters
GET  /api/acquisition/keywords
GET  /api/acquisition/audit-log               -- immutable history
```

### 4.3 Proposals (Safe Write)
```
POST /api/acquisition/proposals               -- AI or user creates
GET  /api/acquisition/proposals/:id
POST /api/acquisition/proposals/:id/approve   -- human only
POST /api/acquisition/proposals/:id/reject
POST /api/acquisition/proposals/:id/rollback  -- if executed
```

### 4.4 Conversions & Webhooks
```
POST /api/acquisition/google/lead-webhook     -- Google Lead Form
POST /api/acquisition/conversions             -- CRM pushes outcome
GET  /api/acquisition/conversions/:id/status  -- upload status + Data Manager request_id
```

### 4.5 Dashboards
```
GET  /api/acquisition/dashboard               -- per agency
GET  /api/acquisition/command-center          -- internal Revolis (all agencies)
GET  /api/acquisition/economics               -- unit economics per agency
```

### 4.6 Experiments
```
POST /api/acquisition/experiments
GET  /api/acquisition/experiments/:id
POST /api/acquisition/experiments/:id/start
POST /api/acquisition/experiments/:id/stop
```

---

## 5. Queue Architecture

### 5.1 Job Types
```
SYNC_ACCOUNT
SYNC_CAMPAIGNS
SYNC_AD_GROUPS
SYNC_KEYWORDS
SYNC_SEARCH_TERMS
CALCULATE_SELLER_INTENT
CREATE_PROPOSAL           -- AI-generated
EXECUTE_APPROVED_CHANGE
UPLOAD_CONVERSION
RUN_EXPERIMENT_REVIEW
WASTED_SPEND_SCAN
WEEKLY_REVIEW
```

### 5.2 Job Schema
```sql
id uuid PRIMARY KEY,
tenant_id uuid NOT NULL,
account_id uuid,
provider TEXT,
job_type TEXT NOT NULL,
correlation_id TEXT,          -- for tracing
idempotency_key TEXT,
payload JSONB,
priority INT DEFAULT 5,     -- 1 = highest
status TEXT DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED, DEAD_LETTER
retry_count INT DEFAULT 0,
max_retries INT DEFAULT 3,
scheduled_at TIMESTAMPTZ DEFAULT now(),
started_at TIMESTAMPTZ,
completed_at TIMESTAMPTZ,
error_message TEXT,
result JSONB
```

### 5.3 Processing Flow
```
Scheduler (cron / event-triggered)
    ↓
Priority Queue (Redis / Bull / custom)
    ↓
Provider Worker (rate-limited per tenant)
    ↓
Google Ads API (with exponential backoff)
    ↓
Result → Event Ledger → CRM → Next optimization
```

**Rate Limiting:** Konfigurovateľný parameter `GOOGLE_ADS_RATE_LIMIT_PER_TENANT`. Nastaví sa podľa reálneho Google API quota a typu operácie. Nie je natvrdo zakódovaný v blueprinte.

---

## 6. Google Ads Integration Detail

### 6.1 MCC & Account Linking
- **ROOT MCC:** Revolis SK s.r.o. (alebo holding)
- **SUB-MCC:** Revolis SK, Revolis CZ, ...
- **CLIENT:** RK vlastní účet, Revolis žiada o `Administrative Access` (link invitation)
- **Billing:** CLIENT (default). Voliteľne `consolidated_billing` = TRUE iba ak klient explicitne žiada.

### 6.2 Credential Architecture (Service Account Preferred)
```
Revolis Service Account (backend)
    │
    └── Google Cloud IAM → Ads API scope
        │
        └── ROOT MCC → SUB-MCC → RK001/RK002/...
        │
        └── Developer Token (1x — Revolis aplikácia)

Fallback:
    ├── OAuth per-client (pre RK s vlastným setupom)
    └── Shared user OAuth (pre hybridné scenáre)
```

**Rozhodnutie:** V1 default = **service account**. Google odporúča service account pre organizačný prístup k MCC hierarchii a pre headless/automated workflows. Ak RK už má vlastný Google setup a nechce linknúť pod Revolis MCC, fallback na OAuth per-client.

### 6.3 Offline Conversions (Data Manager API v1.3 — Async)

**Architektúra:**
```
CRM outcome (mandate_signed)
    ↓
Revolis Conversion Router
    ↓
Canonical Conversion Event
    ↓
Data Manager API v1.3 — IngestEvents
    ↓
requestId (async)
    ↓
Scheduled polling: RetrieveRequestStatus
    ↓
SUCCESS / PARTIAL_SUCCESS / FAILURE
    ↓
UPLOADED / FAILED / RETRY (exponential backoff)
```

**Required fields:**
- `conversion_action` (napr. "mandate_signed")
- `conversion_date_time`
- `conversion_value` (optional)
- `currency_code`
- `gclid` OR `gbraid` OR `wbraid`
- Enhanced conversion: `hashed_email`, `hashed_phone_number` (SHA-256)

**Async flow:**
1. POST conversion batch → `IngestEvents` → Data Manager API
2. Receive `requestId`
3. Store `requestId` in `acquisition_conversions.data_manager_request_id`
4. Set status = REQUESTED
5. Scheduled job polls `RetrieveRequestStatus` (~po 30 minútach)
6. Update status: UPLOADED / FAILED
7. If FAILED → retry with exponential backoff (max 3 retries)

**Dôležité:** Test accounts **nepodporujú** conversion uploads. Pre E2E testovanie offline loopu potrebujeme reálny produkčný účet (Stage 1).

---

## 7. Lead Lifecycle & Webhooks

### 7.1 Google Lead Form Webhook
```
Google Ad → Lead Form Submit
    ↓
POST /api/acquisition/google/lead-webhook
    ↓
1. Validate google_key (advertiser-configured webhook key)
2. Check is_test flag (log, do not process as real lead)
3. Idempotency check: lead_id (provider_event_id) + event_type
4. Tenant resolution: campaign_id → agency_id mapping
5. Create acquisition_event (PENDING)
6. Create lead in CRM (async — do NOT call LLM synchronously)
7. Queue: CALCULATE_SELLER_INTENT
8. Push notification to maklér
```

**Poznámka:** Google Lead Form webhook používa `google_key` na validáciu, nie klasickú cryptographic signature verification. `google_key` sa nastavuje pri konfigurácii webhooku v Google Ads.

### 7.2 Seller Intent Score — Heuristic v1 (0-100)
**Signály:**
- +20: valuation request
- +15: phone provided
- +15: urgency < 3 months
- +10: owner language (nie nájomca)
- +10: Bratislava / high-value area
- +10: repeated visits
- +5: property type specified
- -10: no contact info
- -5: tenant/buyer language

**Output:**
```json
{
  "score": 87,
  "tier": "HIGH",
  "version": "heuristic_v1",
  "reasoning": "+20 valuation request, +15 phone, +15 urgency <3m, +10 owner, +10 location, +10 repeat visits, -5 no address yet",
  "recommended_sla": "5_minutes"
}
```

**Kalibrácia (budúcnosť):**
```
heuristic_v1 score
        ↓
observed outcome (appointment rate, mandate rate)
        ↓
calibrated probability model v2
        ↓
"Leads so score 87 majú historicky 34 % pravdepodobnosť appointmentu."
```

### 7.3 Maklér SLA (Last-Mile) — V1 Conservative
```
HIGH INTENT (score ≥ 80)
  ↓
  0 min  → push notification + SMS
  5 min  → escalation reminder to team lead
  15 min → manager notification

MEDIUM (50-79)
  ↓
  0 min  → push
  30 min → reminder
  60 min → escalation

LOW (<50)
  ↓
  0 min  → email digest (next business day)
```

**Auto-reassign sa NEaktivuje automaticky v prvom deployment-e.** Pred zapnutím auto-reassign potrebujeme validovať:
- existenciu náhradníka,
- pracovný čas maklérov,
- duplicitné lead-y,
- aktuálny stav v CRM.

---

## 8. AI / LLM Layer

### 8.1 Deterministic Engine (runs first)
```
Input: campaign metrics, lead outcomes
  ↓
Rules:
  - CPL > threshold? flag
  - Spend > budget * 1.2? flag
  - 0 conversions in 14 days? flag
  - Search term cost > €20, 0 conversions? flag
  - Budget pacing > 120%? flag
  ↓
Output: flagged_cases[]
```

### 8.2 LLM Reasoning (only for flagged cases)
```
Input: flagged_case + context + business rules
  ↓
LLM prompt:
  "Campaign X has CPL €48 vs target €28. 
   Last 30 days: 12 leads, 2 qualified, 0 mandates. 
   Search terms show 3 irrelevant queries burning €130. 
   Propose 3 changes with risk score and expected impact."
  ↓
Output: proposal JSON
  ↓
Policy Engine: assign risk class
  ↓
LOW? → auto-execute (if policy enabled)
MEDIUM/HIGH? → human approval queue
```

### 8.3 LLM Cost Governor
```
Per agency per day:
  - deterministic scans: unlimited (SQL/rules)
  - LLM calls: budget limit (napr. €5/agency/deň)
  - ak prekročené → iba HIGH priority cases
```

---

## 9. Unit Economics Engine

### 9.1 True Acquisition Cost (TAC)
```
TAC =
  Google Ads spend
  + Revolis platform fee (prorated)
  + LLM/API/data costs (prorated)
  + Human operations time (prorated)
```

### 9.2 Expected Value (EV) — Opravené

**EV per mandate:**
```
ev_per_mandate = avg_commission_per_mandate × attribution_confidence
```

**Total Attributed EV:**
```
total_ev = mandates_count × avg_commission_per_mandate × attribution_confidence
```

**ROI:**
```
roi = (total_ev - tac) / tac
```

### 9.3 Decision Rules
```
IF tac_per_mandate < ev_per_mandate × 0.3 THEN
  → "Scale budget +20%"

IF tac_per_mandate > ev_per_mandate × 0.6 THEN
  → "Pause & investigate"

IF tac_per_mandate BETWEEN THEN
  → "Maintain & optimize"
```

### 9.4 Dashboard Metrics
```
Today:
  New leads: 7
  Qualified: 3
  Appointments: 1
  Spend: €84
  Qualified CPL: €28
  TAC per mandate: €243
  EV per mandate: €2,100
  ROI: 764%

30 Days:
  Leads: 164
  Qualified: 51
  Mandates: 7
  Spend: €2,480
  Cost/qualified: €48.63
  Cost/mandate: €354.29
```

---

## 10. Acquisition Knowledge Graph

### 10.1 Entity Model
```
[Agency] --runs--> [Campaign]
[Campaign] --targets--> [Keyword]
[Campaign] --uses--> [Creative]
[Campaign] --drives_to--> [LandingPage]
[Campaign] --generates--> [Lead]
[Lead] --has--> [IntentScore]
[Lead] --processed_by--> [Agent]
[Lead] --results_in--> [Outcome]
[Outcome] --feeds--> [Conversion]
[Conversion] --optimizes--> [Campaign]
```

### 10.2 Learning Patterns (Anonymized)
```
Pattern: "valuation angle in Bratislava"
  Geography: bratislava
  Campaign type: search
  Hypothesis: "Koľko stojí môj byt?" outperforms "Chcete predať byt?"
  Outcome: WIN
  Confidence: 0.91
  Sample size: 1,247
  Avg mandate CPA: €189 vs €243 baseline
```

### 10.3 Cross-Tenant Rules
- **NEVER:** raw PII, lead lists, CRM data
- **ALWAYS:** aggregated, anonymized, pattern-only
- **USE CASE:** "Nová RK v Bratislave → existuje vysokokonfidenčný pattern: valuation angle"

---

## 11. Implementation Roadmap

### Stage 0: Sandbox (Week 1-2)
**Cieľ:** Overiť API pripojenie, sync a tenant isolation bez reálnych peňazí.

- [ ] Vytvoriť **Google Test MCC** + test client account (max 50 test accounts v hierarchy)
- [ ] Implementovať **service account** OAuth flow + encrypted credential vault
- [ ] Postaviť DB tabuľky: `acquisition_accounts`, `acquisition_campaigns`, `acquisition_events`
- [ ] **Composite FKs:** `(agency_id, acquisition_account_id)` na všetkých child tabuľkách
- [ ] Read-only sync: campaign, ad group, keyword, search term, metrics
- [ ] Test webhook plumbing (s `is_test=true`)
- [ ] Supabase RLS policies — tenant isolation test
- [ ] Dashboard: zobraziť syncnuté dáta z testovacieho účtu
- [ ] Audit log: každý sync logovaný

**Definition of Done — Stage 0 PASS:**
```
[✓] OAuth connect funguje
[✓] credential sa uloží encrypted
[✓] test MCC sa identifikuje
[✓] customer_id sa nikdy neberie z client payload
[✓] sync campaign funguje
[✓] sync ad group funguje
[✓] sync keyword funguje
[✓] sync search terms funguje
[✓] metrics sync funguje
[✓] agency A → iba A data
[✓] agency B → iba B data
[✓] cross-tenant attack → 403 / no data
[✓] duplicate sync → idempotentný
[✓] failed API call → retry
[✓] API rate limit → backoff
[✓] žiadny write do Google Ads
[✓] audit log funguje
[✓] credentials nie sú v logoch
[✓] credentials nie sú v LLM context
```

**Dôležité obmedzenie test accountu:**
- Neservuje reklamy, nemá billing, nemá serving data
- **Nepodporuje conversion uploads** — offline loop sa tu nedá otestovať
- Pre E2E conversion test potrebujeme Stage 1 (reálny účet)

### Stage 1: First Real RK — Lead Loop (Week 3-6)
**Cieľ:** Celý loop od reklamy po lead v CRM.

- [ ] Pripojiť **1 reálnu RK** s malým budgetom (management access, nie ownership)
- [ ] Google Lead Form webhook → CRM lead (s `google_key` validáciou)
- [ ] Seller Intent Score — Heuristic v1
- [ ] Maklér notification (push/SMS)
- [ ] Lead status tracking: NEW → CONTACTED → QUALIFIED
- [ ] **Definition of Done:** Lead z Google Ads sa objaví v CRM do 60 sekúnd. Maklér dostane notifikáciu.

### Stage 2: Full Business Loop (Week 7-10)
**Cieľ:** Offline conversion feedback — zavrieť business loop.

- [ ] CRM outcomes: QUALIFIED → APPOINTMENT → MANDATE_SIGNED
- [ ] Offline conversion upload cez **Data Manager API v1.3** (async: requestId + RetrieveRequestStatus polling)
- [ ] Conversion ladder: optimize for QUALIFIED
- [ ] Proposal engine: AI navrhuje, človek schvaľuje
- [ ] Audit log: každá zmena logovaná
- [ ] **Definition of Done:** Keď sa lead stane mandátom, Google Ads dostane spätnú väzbu do 24 hodín cez Data Manager API.

### Stage 3: Multi-Tenant Validation (Week 11-14)
**Cieľ:** Overiť, že systém bezpečne izoluje viacero RK.

- [ ] **3 RK** pod jedným SUB-MCC
- [ ] Tenant isolation test: dáta RK1 nie sú viditeľné pre RK2
- [ ] Queue-based sync pre všetky 3
- [ ] Feature flags: enable/disable per agency
- [ ] **Definition of Done:** Sync 3 účtov paralelne bez cross-tenant leaku.

### Stage 4: Scale to 10 RK (Week 15-20)
**Cieľ:** Operatívna škálovateľnosť.

- [ ] Scheduler + queue workers
- [ ] Automated low-risk operations (negative keywords, RSA refresh)
- [ ] Weekly review automation
- [ ] Wasted spend scanner
- [ ] **Definition of Done:** 10 RK beží produkčne. Revolis operátor vidí command center.

### Stage 5: Economics & Learning (Week 21-26)
**Cieľ:** Systém vie rozhodovať o budget-e na základe ROI.

- [ ] Unit Economics Engine live
- [ ] Acquisition Knowledge Graph — first patterns
- [ ] Experiment engine: A/B testy kampaní
- [ ] LLM Cost Governor
- [ ] **Definition of Done:** Systém vie povedať "Campaign B má €100/mandate, Campaign A €167/mandate — presuň budget."

### Stage 6: 25–50 RK (Week 27-36)
**Cieľ:** Stabilita a monitoring.

- [ ] Sub-MCC hierarchia (SK, CZ)
- [ ] Advanced retry/backoff
- [ ] Monitoring: API quota, sync freshness, failed uploads
- [ ] Maklér SLA dashboard
- [ ] **Definition of Done:** 50 RK, <1% failed sync rate, <5 min lead-to-CRM latency.

### Stage 7: 100+ RK & Multi-Provider (Week 37+)
**Cieľ:** Plná škálovateľnosť a learning.

- [ ] Meta Ads adapter (rovnaký event model)
- [ ] Cross-tenant anonymized learning
- [ ] Autonomous low-risk policy engine
- [ ] Microsoft Ads adapter
- [ ] **Definition of Done:** 100 RK na Google, 20 na Meta. Systém sa učí z patternov.

---

## 12. Risk Classes & Approval Matrix

| Change Type | Example | Risk | Execution |
|-------------|---------|------|-----------|
| Add negative keyword (irrelevant) | "zamestnanie bratislava" | LOW | Auto (po policy schválení) |
| Refresh RSA copy | Nový headline | LOW | Auto (po policy schválení) |
| Bid adjustment +10% | High-converter losing IS | MEDIUM | AI proposal → human approval |
| Budget shift +20% | Scale winning campaign | MEDIUM | AI proposal → human approval |
| Campaign objective change | Maximize conversions → Target CPA | HIGH | Mandatory human approval |
| Conversion tracking setup | Nový conversion action | HIGH | Mandatory human approval |
| Major budget increase | +100% | HIGH | Mandatory human approval |

---

## 13. Testing Strategy

### 13.1 Per Stage
- **Unit tests:** deterministic engine, intent scoring, tenant isolation
- **Integration tests:** Google Ads API sandbox, webhook handling, conversion upload
- **E2E tests:** Lead form submit → CRM → mandate → conversion feedback → dashboard
- **Security tests:** cross-tenant access attempts, credential exposure checks

### 13.2 Continuous
- **Daily:** sync freshness check, failed job count, API quota usage
- **Weekly:** unit economics review, LLM cost per agency, experiment results
- **Monthly:** security audit, GDPR compliance check, MCC limit review

---

## 14. What NOT to Build (Anti-Requirements)

- ❌ Generic marketing dashboard (nie je core)
- ❌ Full SEO platform (iba GSC quick wins cez existing tool)
- ❌ Social media scheduler
- ❌ Giant reporting suite (focus on action, nie reporty)
- ❌ Autonomous unrestricted AI (tiered only)
- ❌ 20 ad networks naraz (Google first, potom Meta)
- ❌ Complex attribution model (last-click + offline conversion stačí pre V1)
- ❌ Cross-tenant raw-data learning (anonymized patterns only)
- ❌ Auto-reassign maklérov v Stage 0–2 (bez validácie business procesov)
- ❌ LLM v Stage 0 (deterministický sync only)
- ❌ Meta / Microsoft v Stage 0–2 (Google only)
- ❌ Budget changes / campaign mutations v Stage 0 (read-only only)

---

## 15. Stage 0 Kickoff — This Week

### Day 1-2: Setup
- [ ] CTO review & lock this document
- [ ] Create Google Test MCC (Revolis Test Root)
- [ ] Create 2 test client accounts under Test MCC
- [ ] Set up Google Cloud project + enable Google Ads API
- [ ] Generate service account + download JSON key
- [ ] Store service account key in encrypted vault (KMS / HashiCorp / AWS SM)

### Day 3-5: DB & API
- [ ] Inspect existing Revolis monorepo — identify `agencies`, `leads`, `activities`, `teams`, `profiles` tables
- [ ] Create migration: `acquisition_accounts`, `acquisition_campaigns`, `acquisition_events`
- [ ] Add composite FKs: `(agency_id, acquisition_account_id)`
- [ ] Implement RLS policies in Supabase
- [ ] Implement `POST /api/acquisition/google/connect` (service account flow)
- [ ] Implement read-only sync endpoints

### Day 6-10: Sync & Test
- [ ] Implement campaign sync worker
- [ ] Implement ad group sync worker
- [ ] Implement keyword sync worker
- [ ] Implement search term sync worker
- [ ] Implement metrics sync worker
- [ ] Add retry + exponential backoff
- [ ] Add idempotency (hash-based)
- [ ] Add audit logging
- [ ] Run Stage 0 PASS checklist
- [ ] Fix any failures

### Day 11-14: Dashboard & Isolation
- [ ] Build basic acquisition dashboard (read-only data display)
- [ ] Run cross-tenant isolation test
- [ ] Run duplicate sync test
- [ ] Run rate limit backoff test
- [ ] Document findings
- [ ] **Stage 0 PASS or FAIL**

### If PASS → Stage 1 planning
### If FAIL → fix and re-run

---

*"Revolis nebude Ads Manager. Revolis bude Acquisition Operating System."*
