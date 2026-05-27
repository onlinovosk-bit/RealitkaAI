# RENE vs MYPORT vs REVOLIS — Competitive Analysis

> **Classification:** Internal product strategy (Revolis CRM)  
> **Audience:** Engineering, product, orchestration agents  
> **Stealth note:** Factual feature comparison only — no external competitive messaging or customer-specific tactics in this doc.

**Created:** 2026-05-27  
**Updated:** 2026-05-27  
**Status:** Ready for implementation

---

## 1. Feature comparison

| Feature | RENE (Mobile App) | MYPORT (Web, Finportal) | REVOLIS (Web + Planned) |
|---------|-------------------|--------------------------|------------------------|
| **Nábory & Lead Management** | ✅ Kalendár, obhliadky | ❌ Nie | ✅ AI-powered lead triage |
| **Ponuka / Proposal Generator** | ❌ Manuálne | ✅ Automatický | 🔄 Planned |
| **eSignature / Verifikácia** | ❌ Nie | ✅ SMS kód autentifikácia | 🔄 Planned |
| **Automatický import dát** | ❌ Nie | ✅ OCR z ID, automatické pole-filling | 🔄 Planned |
| **AI Chatbot** | ✅ RENE Bot | ❌ Chat support iba | ✅ Revolis AI Asistent |
| **Porovnávač produktov** | ❌ Nie | ✅ Integrovaný (poistenie) | ❌ Nie (real-estate focus) |
| **Mobile-first** | ✅ iOS/Android native | ❌ Web-only | 🔄 Planned |
| **Štatistiky & Analytics** | ✅ Základné | ✅ Pokročilé notifikácie | ✅ Predictive AI (planned) |
| **Integrácie tretích strán** | ❌ Nie | ✅ Banky, poisťovne | 🔄 Planned (Realvia, banky) |
| **Offline mode** | ✅ Áno | ❌ Nie | 🔄 Planned |
| **E-notifikácie** | ❌ Nie | ✅ Elektronické notifikácie | ✅ Email/SMS |

---

## 2. Target audience analysis

### RENE (Real-estate makléri)

```
Typ: Makléri na teréne
Potreba: Rýchla správa obhliadok, ponúk, náboru
Bolesť: Vysoký podiel času na teréne, obmedzená digitálna administratíva
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

## 3. SWOT — top features for Revolis

### Strengths

| Feature | Výhoda |
|---------|--------|
| **AI-powered Lead Triage** | Zjednocuje leady podľa konverzie; konkurenti v segmente nemajú ekvivalent. |
| **Real Estate Specialization** | Zabudované kategórie (byt, dom, pozemok). MYPORT je finančný. |
| **Backend + Database** | Základ pre predictive analytics. RENE je primárne mobilný frontend. |
| **Team Collaboration** | Makléri si delia leady a poznámky. MYPORT je orientovaný na jednotlivcov. |
| **Realvia Integration** | Priame napojenie na export — diferenciátor v kategórii. |
| **Revolis AI Asistent** | Silný AI chatbot v real-estate kontexte. |

### Weaknesses

| Feature | Problém | Status (2026-05-27) |
|---------|---------|---------------------|
| **Žiadny Mobile App** | RENE vyhráva v teréne. Makléri trávia väčšinu času mimo kancelárie. | 🔴 Backlog |
| **Žiadna eSignature** | MYPORT má SMS autentifikáciu. Revolis potrebuje ekvivalent. | 🔄 Backlog |
| **Nespracovaná OCR** | MYPORT má automatický import z ID. Revolis nemá. | 🔄 Backlog |
| **Bez offline mode** | RENE funguje bez internetu. Revolis nie. | 🔄 Backlog |
| **Málo integrácií** | MYPORT je bridge medzi bankami. Revolis rozširuje ekosystém. | 🔄 In progress (Realvia) |
| **Leads nie sú dostupní v UI** | 451 leadov v DB, 0 zobrazených. | ✅ Fix merged (#69) — overiť produkciu |

### Opportunities

| Feature | Príležitosť |
|---------|-----------|
| **Mobile App (field parity)** | Native iOS/Android s terénnymi workflow. |
| **Predictive Analytics** | „Tento lead má 85% šancu na uzavretie.“ — AI diferenciátor. |
| **Banking Integrations** | Hypotéky, poisťovne na jednom mieste (real-estate kontext). |
| **Real-time Notifications** | SMS/Email push keď lead reaguje. |
| **White-label for realitné siete** | Revolis ako brandovaný systém pre partnerské siete. |
| **Video Meeting Integration** | Zoom/Teams pre virtuálne obhliadky. |

### Threats

| Feature | Hrozba |
|---------|--------|
| **RENE rastie** | Native mobile + AI bot — silný appeal pre terénnych maklérov. |
| **MYPORT compliance engine** | Potenciálna expanzia do realít cez finančné partnerstvá. |
| **Realvia vlastný ekosystém** | Vlastný CRM od portálu by obmedzil integračnú výhodu. |
| **Nové startupy s AI** | Rýchlejší AI + mobile stack môže znížiť market share. |
| **Zvykovanie klientov** | Vysoké prepínacie náklady medzi nástrojmi pre maklérov. |

---

## 4. Strategic priority (impact vs effort)

```
HIGH IMPACT / LOW EFFORT:
  🟢 Event Scheduler        → [3–5 dní, +15% conversion]
  🟢 Proposal Generator      → [1–2 týždne, +3× capacity]

HIGH IMPACT / HIGH EFFORT:
  🔴 Mobile App              → [2–4 týždne, +60% market reach]
  🔴 Predictive Analytics    → [3–4 týždne, +40% deal close rate]

LOW IMPACT / LOW EFFORT:
  🟡 Offline Mode            → [1 týždeň, +5% utility]

LOW IMPACT / HIGH EFFORT:
  ⚫ eSignature + SMS Auth     → [2–3 týždne, +10% compliance]
  ⚫ Banking Integrations     → [4–6 týždňov, niche audience]
```

---

## 5. Task list — Event Scheduler (implementation guide)

### Phase 1: Database & Backend (2 dni)

```sql
-- User spec: realvia_events
CREATE TABLE realvia_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  property_id TEXT NOT NULL,
  lead_id UUID NOT NULL REFERENCES leads(id),
  agent_id UUID NOT NULL REFERENCES profiles(id),
  event_type VARCHAR(50) NOT NULL,  -- 'viewing', 'callback', 'followup'
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INT DEFAULT 30,
  notes TEXT,
  client_phone VARCHAR(20),
  client_name VARCHAR(100),
  confirmation_status VARCHAR(20) DEFAULT 'pending',  -- pending, confirmed, cancelled
  sms_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_agent_date ON realvia_events(agent_id, scheduled_at);
CREATE INDEX idx_events_lead ON realvia_events(lead_id);
```

> **Repo gap (PR #70):** Implementácia používa `scheduled_events` + `/api/scheduled-events`. Pozri [orchestrator-task-board.md](./orchestrator-task-board.md) pre align/rename odporúčanie.

### Phase 2: API Endpoints (2 dni)

```typescript
// User spec: apps/crm/src/app/api/events/route.ts

POST /api/events
  → Create obhliadku
  → Send SMS to client
  → Add to agent calendar

GET /api/events?agent_id=xxx&from=2026-05-27&to=2026-06-02
  → List obhliadok na týždeň

PATCH /api/events/:id
  → Update čas, poznámky, status

DELETE /api/events/:id
  → Cancel obhliadka (soft-delete, SMS notifikácia klientovi)
```

### Phase 3: Frontend Component (3 dni)

```typescript
// apps/crm/src/components/leads/EventScheduler.tsx

Features:
  ✅ Calendar view (týždeň, mesiac)
  ✅ Quick "Schedule viewing" z lead card
  ✅ Auto-send SMS s časom + lokáciou
  ✅ Notifications keď lead potvrdí/zruší
  ✅ Conflicts detection (agent nemôže byť na 2 miestach)
  ✅ Agent Timeline view (mobil)
  ✅ Sync s Google Calendar (future)
```

### Phase 4: Testing & Deployment (2 dni)

```bash
# Unit tests
npm run test src/app/api/events/*.test.ts

# E2E tests
npm run test:e2e --spec="events-scheduler.cy.ts"

# Vercel deployment
git push origin feature/event-scheduler → PR merge → Auto-deploy production
```

### Timeline

```
Mon 5/27:  Database schema + indexes
Tue–Wed 5/28–29: API endpoints
Thu–Fri 5/30–31: Frontend
Mon 6/2: Testing + deployment
Tue 6/3: Live pre pilot zákazníka
```

---

## 6. Final recommendations

### 30-day roadmap (pilot customer)

```
TÝŽDEŇ 1: Event Scheduler live
├─ Obhliadky sa auto-synchronizujú s kalendárom
└─ SMS notifikácie klientom s časom + lokáciou

TÝŽDEŇ 2–3: Proposal Generator
├─ Vygenerovanie ponuky v 1 kliknutí
└─ Auto-fill z lead dát + property detailov

TÝŽDEŇ 4+: Mobile App Beta
├─ Revolis v teréne — offline sync, GPS check-in, foto z obhliadky
└─ Parita s terénnymi workflow konkurentov
```

### Positioning vs alternatives

| Revolis | RENE | MYPORT |
|---------|------|--------|
| Real Estate AI | General mobile | Finance only |
| Event Scheduler | Calendar (basic) | N/A |
| Proposal Gen. | N/A | Automatické (finance) |
| Predictive Lead Score | N/A | N/A |
| Realvia Native | N/A | N/A |
| **Diferenciátor:** AI + Integration | **Diferenciátor:** Mobile | **Diferenciátor:** Compliance |

**Revolis advantage:** Real-estate AI + integration depth (Realvia) + path to mobile parity. MYPORT nemá real-estate focus; RENE nemá backend AI vrstvu.

---

## 7. Risk mitigation

| Risk | Mitigation |
|------|-----------|
| RENE launches features faster | Ship Event Scheduler v P1 (3–5 dní) |
| Makléri zostávajú na existujúcom nástroji | Pilot onboarding + sync demo s existujúcimi property dátami |
| Realvia zmení API | Reverse-compatibility + fallback mode |
| Leads UI problém (451→0) | Fix merged (#69); produkčný smoke + hotfix branch ak treba |

---

*Maintained by L99 Chief Orchestrator. Update when PR #70–#73 land or competitive landscape shifts.*
