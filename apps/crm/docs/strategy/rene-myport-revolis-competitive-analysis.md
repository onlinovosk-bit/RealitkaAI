# RENE vs MYPORT vs REVOLIS — Konkurenčná analýza

> **Classification:** Internal product strategy (Revolis CRM)  
> **Audience:** Engineering, product, orchestration agents  
> **Stealth note:** Faktické porovnanie funkcií — bez externého konkurenčného messagingu a zákazníckych taktík v tomto dokumente.

**Created:** 2026-05-27  
**Updated:** 2026-05-27 (L99 inventory pass)  
**Status:** Ready for implementation

---

## 1. Porovnanie features

| Feature | RENE (Mobile App) | MYPORT (Web, Finportal) | REVOLIS (Web + Planned) |
|---------|-------------------|--------------------------|------------------------|
| **Nábory & Lead Management** | ✅ Kalendár, obhliadky | ❌ Nie | ✅ AI-powered lead triage |
| **Ponuka / Proposal Generator** | ❌ Manuálne | ✅ Automatický | 🔄 Planned (Revolis) |
| **eSignature / Verifikácia** | ❌ Nie | ✅ SMS kód autentifikácia | 🔄 Planned |
| **Automatický import dát** | ❌ Nie | ✅ OCR z ID, automatické pole-filling | 🔄 Planned |
| **AI Chatbot** | ✅ RENE Bot | ❌ Chat support iba | ✅ Revolis AI Asistent |
| **Porovnávač produktov** | ❌ Nie | ✅ Integrovaný (najpoistenie.sk) | ❌ Nie (real-estate focus) |
| **Mobile-first** | ✅ iOS/Android native | ❌ Web-only | 🔄 Planned |
| **Štatistiky & Analytics** | ✅ Základné | ✅ Pokročilé notifikácie | ✅ Predictive AI (planned) |
| **Integrácie tretích strán** | ❌ Nie | ✅ Banky, poisťovne | 🔄 Planned (Realvia, banky) |
| **Offline mode** | ✅ Áno | ❌ Nie | 🔄 Planned |
| **E-notifikácie** | ❌ Nie | ✅ Elektronické notifikácie | ✅ Email/SMS |

---

## 2. Analýza cieľovej skupiny

### RENE (Real-estate makléri)

```
Typ: Makléri na teréne
Potreba: Rýchla správa obhliadok, ponúk, náboru
Bolesť: 70 % času na teréne, obmedzená digitálna administratíva bez papiera
Device: Smartphone (primary)
```

### MYPORT (Poistení / finanční sprostredkovatelia)

```
Typ: Broker, agent, poradenský pracovník
Potreba: Bez fyzického kontaktu, automatizácia, compliance
Bolesť: Papierová administrativa, manuálny import dát
Device: Desktop + Web (secondary mobile)
```

### REVOLIS (Real-estate CRM + AI)

```
Typ: Realitní agenti, manažéri kancelárií
Potreba: AI triage leadov, produktivita, predaj
Bolesť: Rozptýlené leady, neefektívna práca v teréne, chýbajúca mobilná vrstva
Device: Desktop (primary), Mobile (emerging need)
```

---

## 3. SWOT — top features pre Revolis

### Strengths

| Feature | Výhoda |
|---------|--------|
| **AI-powered Lead Triage** | Zjednocuje leady podľa konverzie; RENE/MYPORT v segmente nemajú ekvivalent. |
| **Real Estate Specialization** | Zabudované kategórie (byt, dom, pozemok). MYPORT je finančný. |
| **Backend + Database** | Základ pre predictive analytics. RENE je primárne mobilný frontend. |
| **Team Collaboration** | Makléri si delia leady a poznámky. MYPORT orientovaný na jednotlivcov. |
| **Realvia Integration** | Priame napojenie na export — diferenciátor v kategórii. |
| **Revolis AI Asistent** | Silný AI chatbot v real-estate kontexte. |

### Weaknesses

| Feature | Problém | Status (2026-05-27) |
|---------|---------|---------------------|
| **Žiadny Mobile App** | RENE vyhráva v teréne. | 🔴 Backlog (P2) |
| **Žiadna eSignature** | MYPORT má SMS autentifikáciu. | 🔄 Backlog (P3) |
| **Nespracovaná OCR** | MYPORT má import z ID. | 🔄 Backlog |
| **Bez offline mode** | RENE funguje bez internetu. | 🔄 Backlog (P3) |
| **Málo integrácií** | MYPORT bridge medzi bankami. | 🔄 Realvia v progrese (#66) |
| **Leads nie sú v UI** | 451 v DB, 0 v prehliadači. | ✅ Fix #69 merged — overiť produkciu |

### Opportunities

| Feature | Príležitosť |
|---------|-----------|
| **Mobile App (field parity)** | Native iOS/Android s terénnymi workflow. |
| **Predictive Analytics** | „Tento lead má 85 % šancu na uzavretie.“ |
| **Banking Integrations** | Hypotéky, poisťovne (real-estate kontext). |
| **Real-time Notifications** | SMS/Email push pri reakcii leadu. |
| **White-label pre realitné siete** | Brandovaný systém pre partnerské siete. |
| **Video Meeting Integration** | Zoom/Teams pre virtuálne obhliadky. |

### Threats

| Feature | Hrozba |
|---------|--------|
| **RENE rastie** | Native mobile + AI bot. |
| **MYPORT compliance engine** | Expanzia do realít cez finančné partnerstvá. |
| **Realvia vlastný ekosystém** | Vlastný CRM od portálu. |
| **Nové startupy s AI** | Rýchlejší AI + mobile stack. |
| **Zvykovanie klientov** | Vysoké prepínacie náklady pre maklérov. |

---

## 4. Strategická priorita (impact vs effort)

```
HIGH IMPACT / LOW EFFORT:
  🟢 Event Scheduler        → [3–5 dní, +15 % conversion]
  🟢 Proposal Generator      → [1–2 týždne, +3× capacity]

HIGH IMPACT / HIGH EFFORT:
  🔴 Mobile App              → [2–4 týždne, +60 % market reach]
  🔴 Predictive Analytics    → [3–4 týždne, +40 % deal close rate]

LOW IMPACT / LOW EFFORT:
  🟡 Offline Mode            → [1 týždeň, +5 % utility]

LOW IMPACT / HIGH EFFORT:
  ⚫ eSignature + SMS Auth     → [2–3 týždne, +10 % compliance]
  ⚫ Banking Integrations     → [4–6 týždňov, niche audience]
```

---

## 5. Task list — Event Scheduler (implementation guide)

### Phase 1: Database & Backend (2 dni)

**User spec (návrh):** tabuľka `realvia_events`

```sql
CREATE TABLE realvia_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  property_id TEXT NOT NULL,
  lead_id UUID NOT NULL REFERENCES leads(id),
  agent_id UUID NOT NULL REFERENCES profiles(id),
  event_type VARCHAR(50) NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INT DEFAULT 30,
  notes TEXT,
  client_phone VARCHAR(20),
  client_name VARCHAR(100),
  confirmation_status VARCHAR(20) DEFAULT 'pending',
  sms_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_agent_date ON realvia_events(agent_id, scheduled_at);
CREATE INDEX idx_events_lead ON realvia_events(lead_id);
```

**Repo realita (PR #70):** tabuľka `scheduled_events`, API `/api/scheduled-events`, migrácia `20260527143000_event_scheduler_phase1.sql`, guide `docs/event-scheduler-implementation-guide.md` (na vetve #70).

> **Odporúčanie:** Ponechať `scheduled_events` ako interný názov (tenant scope, nie len Realvia). Pridať alias `/api/events` v samostatnom PR. Mapovanie polí overiť pred merge #70.

### Phase 2: API Endpoints (2 dni)

```typescript
// User spec: /api/events
POST /api/events   → create obhliadku, SMS klientovi, kalendár agenta
GET  /api/events?agent_id=&from=&to=
PATCH /api/events/:id
DELETE /api/events/:id → soft-delete + SMS cancel
```

### Phase 3: Frontend (3 dni)

```typescript
// apps/crm/src/components/leads/EventScheduler.tsx
// Calendar, quick schedule z lead card, SMS, conflicts, timeline, Google Calendar (future)
```

### Phase 4: Testing & Deployment (2 dni)

Unit + E2E + Vercel preview smoke + produkčný rollout.

### Timeline (pilot)

```
Po 5/27:  DB + API (#70)
5/28–5/31: UI + SMS hooks (nový PR)
6/2:       Test + smoke
6/3:       Live pre pilot zákazníka
```

---

## 6. Odporúčania finálne

### 30-dňový roadmap (pilot zákazník)

```
TÝŽDEŇ 1: Event Scheduler live
├─ Obhliadky sa auto-synchronizujú s kalendárom
└─ SMS notifikácie klientom s časom + lokáciou

TÝŽDEŇ 2–3: Proposal Generator
├─ Ponuka v 1 kliknutí
└─ Auto-fill z lead + property

TÝŽDEŇ 4+: Mobile App Beta
├─ Revolis v teréne — offline sync, GPS check-in, foto z obhliadky
└─ Parita s terénnymi workflow konkurentov
```

### Versus konkurencia

| Revolis | RENE | MYPORT |
|---------|------|--------|
| Real Estate AI | General mobile | Finance only |
| Event Scheduler | Calendar (basic) | N/A |
| Proposal Gen. | N/A | Automatické (finance) |
| Predictive Lead Score | N/A | N/A |
| Realvia Native | N/A | N/A |
| **Diferenciátor:** AI + Integration | **Diferenciátor:** Mobile | **Diferenciátor:** Compliance |

**Výhoda Revolis:** Real-estate AI + Realvia sync + cesta k mobilnej parite. MYPORT nemá real-estate focus; RENE nemá backend AI vrstvu.

---

## 7. Risk mitigation

| Risk | Mitigation |
|------|-----------|
| RENE launches features faster | Ship Event Scheduler v P0 (3–5 dní) |
| Makléri zostávajú na existujúcom nástroji | Pilot onboarding + sync demo s existujúcimi property dátami |
| Realvia zmení API | Reverse-compatibility + fallback (#66 replay) |
| Leads UI (451→0) | #69 merged; produkčný smoke; hotfix vetva ak treba |
| Marketing ≠ produkt (brand parity) | P0 audit `apps/marketing` ↔ CRM landing (`PHASE-7-SALES-FUNNEL.md`) |

---

*Maintained by L99 Chief Orchestrator. Súvisiaci board: [orchestrator-task-board.md](./orchestrator-task-board.md).*
