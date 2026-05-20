# 📘 Skill: TYPESCRIPT_CONVENTIONS

## Účel
Jednotný TypeScript štandard naprieč projektom.
Konzistentný kód = rýchlejší review = menej bugov = lepší agent výkon.

---

## Základné pravidlá

```typescript
// ✅ Vždy explicit typy pre funkčné parametre a return hodnoty
async function processLead(leadId: string): Promise<Lead> { ... }

// ❌ Nikdy any (okrem výnimočných prípadov s komentárom prečo)
function process(data: any) { ... }

// ✅ Preferovať interface pred type pre objekty
interface Lead {
  id: string
  email: string
  status: LeadStatus
}

// ✅ Enums pre stavy
enum LeadStatus {
  SCRAPED = 'SCRAPED',
  SCORED = 'SCORED',
  SEGMENTED = 'SEGMENTED',
  OUTREACH_DONE = 'OUTREACH_DONE',
}
```

---

## Import poriadok

```typescript
// 1. Node.js built-ins
import { readFile } from 'fs/promises'

// 2. External packages
import { z } from 'zod'
import { NextRequest } from 'next/server'

// 3. Internal absolute imports (@/)
import { withRevolisGuard } from '@lib/revolis-guard'
import { errorResponse } from '@lib/api-response'

// 4. Relatívne importy
import { validateRealvia } from './validate'

// Prázdny riadok medzi skupinami
```

---

## Async/Await pravidlá

```typescript
// ✅ Vždy try/catch pre async operácie v API routes
export const POST = withRevolisGuard(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const result = await processWebhook(body)
    return Response.json({ data: result })
  } catch (error) {
    console.error('[WEBHOOK_ERROR]', error)
    return Response.json(
      { error: "Internal server error", details: ["Unexpected error"] },
      { status: 500 }
    )
  }
})

// ❌ Nikdy unhandled promises
processWebhook(body) // bez await a bez catch
```

---

## Naming conventions

```typescript
// PascalCase: typy, interfacy, enumy, komponenty
interface LeadScore { ... }
enum LeadStatus { ... }
function LeadCard() { ... }

// camelCase: premenné, funkcie, metódy
const leadScore = 85
async function calculateScore() { ... }

// SCREAMING_SNAKE_CASE: konštanty
const MAX_BATCH_SIZE = 100
const STALE_THRESHOLD_MS = 86400000

// kebab-case: súbory
// lead-score.ts, api-response.ts, realvia-webhook.ts

// Prefix pre boolean
const isActive = true
const hasScore = false
const canProcess = true
```

---

## Null safety

```typescript
// ✅ Optional chaining
const email = lead?.contact?.email ?? 'unknown'

// ✅ Explicit null check pred použitím
const lead = await prisma.lead.findUnique({ where: { id } })
if (!lead) {
  return errorResponse("Not found", [`Lead ${id} does not exist`], 404)
}
// Tu je lead garantovane non-null

// ❌ Non-null assertion bez dôvodu
const lead = await prisma.lead.findUnique({ where: { id } })
lead!.status // nebezpečné
```

---

## Zod validácia (štandard)

```typescript
import { z } from 'zod'

// Definuj schema
const RealviaWebhookSchema = z.object({
  export_id: z.string(),
  type: z.enum(['property', 'lead', 'market_data']),
  action: z.enum(['create', 'update', 'delete']),
  data: z.record(z.unknown()),
  timestamp: z.string().datetime().optional(),
})

// Použi v route
const parsed = RealviaWebhookSchema.safeParse(body)
if (!parsed.success) {
  return errorResponse(
    "Invalid webhook payload",
    parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
  , 400)
}

const webhook = parsed.data // plne typovaný
```

---

## Komentáre

```typescript
// ✅ Komentár vysvetľuje PREČO, nie čo
// IP sa číta z x-forwarded-for kvôli Vercel proxy vrstve
const ip = req.headers.get('x-forwarded-for')?.split(',')[0]

// ❌ Zbytočný komentár (kód hovorí sám za seba)
// Získaj email z body
const email = body.email

// TODO komentáre musia mať meno a dátum
// TODO(andrej, 2026-05-20): Pridať retry logiku pre failed webhooky
```

---

## File organizácia

```
Každý súbor = jedna zodpovednosť

✅ validate.ts → len validačná logika
✅ route.ts → len HTTP handler logika
✅ api-response.ts → len helper funkcie pre responses

❌ Jeden súbor s validáciou + businessovou logikou + DB volaním
```

Max dĺžka súboru: **300 riadkov** – ak viac, refaktoruj.
