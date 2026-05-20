# 🗄️ Skill: DATABASE_STATUS_FLOW

## Účel
Presné stavy záznamov, povolené prechody a pravidlá.
Agent NESMIE meniť stav mimo povolených prechodov. Nesprávny stav = broken automation.

---

## Stavy – kompletný zoznam

### Lead stavy (STEP_HANDOVER rozšírenie)

```
SCRAPED → SCORED → SEGMENTED → OUTREACH_DONE
```

| Stav | Popis | Kto nastavuje |
|---|---|---|
| `SCRAPED` | Lead prišiel (webhook, import) | Realvia webhook / import job |
| `SCORED` | AI ohodnotila lead (0-100) | Decision Engine |
| `SEGMENTED` | Lead zaradený do segmentu | Segmentation job |
| `OUTREACH_DONE` | Kontakt prebehol | CRM agent / manuálne |
| `CLOSED_WON` | Deal uzavretý | Makléri manuálne |
| `CLOSED_LOST` | Lead stratený | Makléri manuálne / Rescue automation |
| `STALE` | Bez aktivity > X dní | TRIAGE_LOCK_STALE_MS timer |
| `RESCUED` | Záchranná automatizácia aktivovaná | Rescue automation |

---

## Povolené prechody (state machine)

```
SCRAPED
  └──→ SCORED           (po AI scoringu)
  └──→ STALE            (ak scoring zlyhá a uplynie timeout)

SCORED
  └──→ SEGMENTED        (po segmentácii)
  └──→ STALE            (ak segmentácia zlyhá)

SEGMENTED
  └──→ OUTREACH_DONE    (po prvom kontakte)
  └──→ STALE            (bez aktivity)

OUTREACH_DONE
  └──→ CLOSED_WON       (manuálne)
  └──→ CLOSED_LOST      (manuálne alebo auto)
  └──→ STALE            (bez follow-up)

STALE
  └──→ RESCUED          (Rescue automation)
  └──→ CLOSED_LOST      (po X dňoch bez reakcie)

RESCUED
  └──→ SEGMENTED        (znovu zaradený)
  └──→ CLOSED_LOST      (ak rescue zlyhá)
```

### ❌ Zakázané prechody
```
CLOSED_WON → akýkoľvek iný stav    (finálny stav)
CLOSED_LOST → akýkoľvek iný stav   (finálny stav, okrem manuálneho override)
OUTREACH_DONE → SCRAPED            (späť zakázané)
SCORED → SCRAPED                   (späť zakázané)
```

---

## Property stavy

| Stav | Popis |
|---|---|
| `ACTIVE` | Nehnuteľnosť aktívna, zobrazená |
| `PENDING` | Čaká na schválenie / spracovanie |
| `SOLD` | Predaná (finálny stav) |
| `RENTED` | Prenajatá (finálny stav) |
| `WITHDRAWN` | Stiahnutá z ponuky |
| `ARCHIVED` | Archivovaná, nie finálna |

---

## Prisma – správne použitie

```typescript
// ✅ Aktualizácia stavu s validáciou
async function transitionLeadStatus(
  leadId: string,
  fromStatus: LeadStatus,
  toStatus: LeadStatus
) {
  // Vždy overiť aktuálny stav pred zmenou
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })

  if (lead?.status !== fromStatus) {
    throw new Error(`Invalid transition: lead is ${lead?.status}, expected ${fromStatus}`)
  }

  return prisma.lead.update({
    where: { id: leadId },
    data: {
      status: toStatus,
      statusChangedAt: new Date(),
      // Vždy logovať prechod
      statusHistory: {
        create: { from: fromStatus, to: toStatus, changedAt: new Date() }
      }
    }
  })
}

// ❌ Zakázané – priama zmena bez validácie
await prisma.lead.update({ where: { id }, data: { status: 'SCORED' } })
```

---

## Batch job pravidlá

```typescript
// AI_JOBS_BATCH_SIZE definuje max počet záznamov naraz
const BATCH_SIZE = parseInt(process.env.AI_JOBS_BATCH_SIZE ?? '10')

// Vždy spracovávať v batchoch, nie všetko naraz
const leads = await prisma.lead.findMany({
  where: { status: 'SCRAPED' },
  take: BATCH_SIZE,
  orderBy: { createdAt: 'asc' }
})
```

---

## Triage Lock

```typescript
// TRIAGE_LOCK_STALE_MS – čas po ktorom je lead považovaný za stale
const STALE_THRESHOLD = parseInt(process.env.TRIAGE_LOCK_STALE_MS ?? '86400000') // 24h default

const staleLeads = await prisma.lead.findMany({
  where: {
    status: { in: ['SCRAPED', 'SCORED', 'SEGMENTED'] },
    updatedAt: { lt: new Date(Date.now() - STALE_THRESHOLD) }
  }
})
```

---

## Rescue Automation

Aktivuje sa keď `RESCUE_AUTOMATION_ENABLED=true` a lead je v stave `STALE`.

```typescript
// Workflow:
// 1. Nájdi STALE leady
// 2. Pošli follow-up správu
// 3. Nastav status na RESCUED
// 4. Ak žiadna reakcia po X dňoch → CLOSED_LOST
```

---

## Indexy (výkon)

```sql
-- Povinné indexy pre status queries
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_status_updated ON leads(status, updated_at);
CREATE INDEX idx_properties_status ON properties(status);
```
