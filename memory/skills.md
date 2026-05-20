# 🛠️ REVOLIS SKILL LIBRARY

---

## Skill: L99_DEPLOY
- **Popis:** Kompletný push na produkciu so zbalením všetkých zmien.
- **Workflow:** git add . -> commit s L99 prefixom -> git push.

---

## Skill: REVOLIS_GUARD_CHECK
- **Popis:** Obalenie akéhokoľvek nového endpointu do bezpečnostného Guardu.
- **Pravidlo:** Žiadny súbor v /api nesmie existovať bez importu @/lib/revolis-guard.

---

## Skill: STEP_HANDOVER
- **Popis:** Zmena statusu v databáze po úspešnom kroku.
- **Pravidlá:** SCRAPED -> SCORED -> SEGMENTED -> OUTREACH_DONE

---

## Skill: REALVIA_INTEGRATION
- **Popis:** Kompletná dokumentácia Realvia webhook integrácie. Agent NESMIE čítať zdrojový kód pri každom requeste – všetko je tu.

### Architektúra
```
Realvia server
    │
    │ POST (s headers + IP)
    ▼
https://app.revolis.ai/api/webhooks/realvia
    │
    ├── apps/crm/src/app/api/webhooks/realvia/route.ts   ← hlavný handler
    ├── apps/crm/src/lib/realvia/validate.ts              ← validácia IP + auth
    └── apps/crm/src/proxy.ts                             ← auth bypass pre webhook
```

### Súbory – čo je kde
| Súbor | Účel |
|---|---|
| `apps/crm/src/app/api/webhooks/realvia/route.ts` | Next.js API route, prijíma POST |
| `apps/crm/src/lib/realvia/validate.ts` | IP whitelist + header autentifikácia |
| `apps/crm/src/proxy.ts` | Bypass autorizácie pre webhook endpoint |

### ENV Premenné
| Premenná | Popis | Príklad |
|---|---|---|
| `REALVIA_ALLOWED_IP` | Povolené IP adresy Realvia serverov (comma-separated) | `185.59.208.101` |
| `REALVIA_IDENTIFIER` | Hodnota hlavičky `identifikator` | `<REALVIA_IDENTIFIER>` |
| `REALVIA_IDENTIFIER_2` | Hodnota hlavičky `identifikator2` | `<REALVIA_IDENTIFIER_2>` |
| `REALVIA_SHARED_SECRET` | Fallback secret pre `x-revolis-secret` header | `<64-char hex>` |

**Nikdy necommitovať do gitu. Nastavujú sa výhradne vo Vercel → Environment Variables → Production.**

### Validačná logika (validate.ts)

**Krok 1 – IP kontrola.** IP sa číta v tomto poradí: `x-forwarded-for` → `x-real-ip` → `cf-connecting-ip`. Porovnáva sa s `REALVIA_ALLOWED_IP` (default: `185.59.208.101`).

**Krok 2 – Autentifikácia:**

Mód A – Realvia native headers (preferovaný):
```
identifikator: <REALVIA_IDENTIFIER>
identifikator2: <REALVIA_IDENTIFIER_2>
```

Mód B – Revolis fallback:
```
x-revolis-secret: <REALVIA_SHARED_SECRET>
```

⚠️ Identifikátory sa posielajú ako **HTTP HEADERS**, NIE v JSON body!

### Správny testovací curl
```bash
curl -X POST https://app.revolis.ai/api/webhooks/realvia \
  -H "Content-Type: application/json" \
  -H "identifikator: <REALVIA_IDENTIFIER>" \
  -H "identifikator2: <REALVIA_IDENTIFIER_2>" \
  -d '{"test": true}'
```

### Očakávané response kódy
| Kód | Význam | Akcia |
|---|---|---|
| `200 OK` | ✅ Funguje | — |
| `401/403` | IP nie je v whitelist alebo chýbajú headers | Skontrolovať ENV |
| `404` | Route neexistuje | Skontrolovať deploy |
| `502/503` | Server down | Skontrolovať Vercel deployment |

### Kľúčové info
- **Export ID klienta:** 1423691836 (Reality Smolko, s. r. o.)
- **Kontakt Realvia:** pani Bereczová
- **Implementované:** 18.05.2026

---

## Skill: ENV_VARIABLES_MAP
- **Popis:** Jediný zdroj pravdy pre všetky ENV premenné projektu. Agent NESMIE hádať hodnoty ENV premenných.

### Pravidlá
1. Nikdy necommitovať `.env` súbory do gitu
2. Production hodnoty sa nastavujú výhradne vo Vercel → Settings → Environment Variables
3. Local dev používa `.env.local` (je v `.gitignore`)
4. Po zmene ENV premenných vo Vercel → treba redeploy
5. Sensitive hodnoty nastavovať s **Sensitive toggle ON** vo Vercel

### Kompletná mapa

**Realvia Integration**
| Premenná | Popis |
|---|---|
| `REALVIA_ALLOWED_IP` | Povolené IP adresy Realvia webhook serverov |
| `REALVIA_IDENTIFIER` | Hodnota hlavičky `identifikator` |
| `REALVIA_IDENTIFIER_2` | Hodnota hlavičky `identifikator2` |
| `REALVIA_SHARED_SECRET` | Fallback autentifikačný secret |

**AI / Decision Engine**
| Premenná | Popis |
|---|---|
| `DECISION_ENGINE_ENABLED` | Zapnutie/vypnutie decision engine (true/false) |
| `CLOSING_WINDOW_ENABLED` | Closing window feature flag |
| `AI_JOBS_BATCH_SIZE` | Počet záznamov spracovaných naraz v AI batch joboch |
| `TRIAGE_LOCK_STALE_MS` | Timeout pre stale triage lock (v ms) |
| `RESCUE_AUTOMATION_ENABLED` | Záchranná automatizácia (true/false) |

**Database**
| Premenná | Popis |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | Direct DB URL (pre Prisma migrations) |

**Auth**
| Premenná | Popis |
|---|---|
| `NEXTAUTH_SECRET` | NextAuth.js secret |
| `NEXTAUTH_URL` | Production URL (`https://app.revolis.ai`) |

**External APIs**
| Premenná | Popis |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key |
| `OPENAI_API_KEY` | OpenAI API key (fallback) |

### Ako pridať novú ENV premennú
1. Vercel → projekt → Settings → Environment Variables
2. Kliknúť **"Import .env"** a vložiť obsah
3. Vybrať environment: **Production**
4. Zapnúť **Sensitive** toggle pre secrets
5. Kliknúť **Save** → **Redeploy**

### Generovanie secretov
```bash
openssl rand -hex 32
```

---

## Skill: DEPLOYMENT_CHECKLIST
- **Popis:** Presný postup pred každým deployom. Nedodržanie → broken production.

### ZAKÁZANÉ operácie (NIKDY)
```
❌ git merge
❌ git push --force
❌ deploy bez buildu
❌ commit súborov mimo aktuálneho scope
❌ unrelated lokálny noise v commite
```

### Workflow – krok za krokom

**1. Lint**
```bash
cd apps/crm && pnpm lint
# Nula errorov = OK. Ak sú errory → opraviť pred pokračovaním.
```

**2. Build**
```bash
pnpm build
# Musí skončiť bez chýb. Build error = STOP, nedeploy.
```

**3. Scoped commit**
```bash
# Commitovať VÝHRADNE súbory súvisiace s aktuálnym taskom
git add apps/crm/src/lib/realvia/validate.ts
# NIE: git add .  ← zakázané ak sú iné zmenené súbory
git commit -m "feat(realvia): oprav webhook IP validáciu"
```

**4. Push**
```bash
git push origin feature/nazov-vetvy
```

**5. PR** – otvoriť na GitHub, skontrolovať preview URL, až po review → merge → auto production deploy.

### Commit message formát
```
feat     → nová funkcionalita
fix      → oprava bugy
chore    → údržba, deps
refactor → refaktoring bez zmeny správania
docs     → dokumentácia
```

### Pre-deploy kontrolný zoznam
```
□ pnpm lint → 0 errors
□ pnpm build → success
□ Len scoped súbory v commite
□ ENV premenné nastavené vo Vercel (ak nové)
□ PR otvorený a skontrolovaný
□ Preview deployment funguje
```

---

## Skill: API_ROUTE_CONVENTION
- **Popis:** Štandardy pre každý API endpoint v projekte. Porušenie = bezpečnostná diera alebo broken production.

### KRITICKÉ PRAVIDLO #1 – Revolis Guard
```
Každý súbor v /api MUSÍ importovať @lib/revolis-guard
```
```typescript
// ✅ SPRÁVNE
import { withRevolisGuard } from '@lib/revolis-guard'
export const POST = withRevolisGuard(async (req) => { ... })

// ❌ ZAKÁZANÉ
export async function POST(req: Request) { ... }
```

**Výnimky:** `/api/webhooks/*` (vlastná validácia), `/api/health`, `/api/auth/*`

### KRITICKÉ PRAVIDLO #2 – HTTP Status kódy
| Situácia | Status |
|---|---|
| Úspech (dáta) | `200` |
| Vytvorený záznam | `201` |
| Chybný request | `400` |
| Neautorizovaný | `401` |
| Zakázaný | `403` |
| Nenájdené | `404` |
| Server error | `500` |

### Štruktúra API route súboru
```typescript
import { withRevolisGuard } from '@lib/revolis-guard'
import { NextRequest } from 'next/server'

export const POST = withRevolisGuard(async (req: NextRequest) => {
  try {
    const body = await req.json()
    return Response.json({ data: result })
  } catch (error) {
    return Response.json(
      { error: "Internal server error", details: [String(error)] },
      { status: 500 }
    )
  }
})
```

---

## Skill: ERROR_RESPONSE_FORMAT
- **Popis:** Jeden štandardný formát chybových odpovedí naprieč celým projektom.

### Zlaté pravidlo
```
KAŽDÁ chybová odpoveď = { error: string, details: string[] }
NIKDY inak.
```

### TypeScript typ
```typescript
interface ApiErrorResponse {
  error: string      // Krátky, ľudsky čitateľný popis
  details: string[]  // Pole konkrétnych detailov
}
```

### Helper funkcia
```typescript
export function errorResponse(error: string, details: string[], status = 400): Response {
  return Response.json({ error, details }, { status })
}

// Použitie:
return errorResponse("Forbidden", ["Source IP not in allowed list"], 403)
```

### Katalóg štandardných chýb
```json
{ "error": "Forbidden", "details": ["Source IP 1.2.3.4 not in allowed list"] }
{ "error": "Forbidden", "details": ["Missing authentication headers"] }
{ "error": "Validation failed", "details": ["Missing field: email"] }
{ "error": "Not found", "details": ["Lead ID 123 does not exist"] }
{ "error": "Internal server error", "details": ["Unexpected error, contact support"] }
```

### Čo NIKDY nerobiť
```typescript
// ❌
return new Response("Unauthorized", { status: 401 })
return Response.json({ message: "error" }, { status: 400 })
// ✅
return Response.json({ error: "Unauthorized", details: ["Token missing"] }, { status: 401 })
```

---

## Skill: DATABASE_STATUS_FLOW
- **Popis:** Presné stavy záznamov, povolené prechody a pravidlá. Nesprávny stav = broken automation.

### Lead stavy
| Stav | Popis | Kto nastavuje |
|---|---|---|
| `SCRAPED` | Lead prišiel (webhook, import) | Realvia webhook |
| `SCORED` | AI ohodnotila lead (0-100) | Decision Engine |
| `SEGMENTED` | Lead zaradený do segmentu | Segmentation job |
| `OUTREACH_DONE` | Kontakt prebehol | CRM agent / manuálne |
| `CLOSED_WON` | Deal uzavretý | Makléri manuálne |
| `CLOSED_LOST` | Lead stratený | Makléri / Rescue automation |
| `STALE` | Bez aktivity > X dní | TRIAGE_LOCK_STALE_MS timer |
| `RESCUED` | Záchranná automatizácia aktivovaná | Rescue automation |

### Povolené prechody
```
SCRAPED → SCORED → SEGMENTED → OUTREACH_DONE → CLOSED_WON
                                              → CLOSED_LOST
AKÝKOĽVEK → STALE → RESCUED → SEGMENTED
                             → CLOSED_LOST
```

### Zakázané prechody
```
❌ CLOSED_WON → čokoľvek (finálny stav)
❌ CLOSED_LOST → čokoľvek (finálny stav)
❌ Akýkoľvek späťchod (SCORED → SCRAPED atď.)
```

### Správne použitie Prisma
```typescript
// ✅ Vždy overiť aktuálny stav pred zmenou
const lead = await prisma.lead.findUnique({ where: { id: leadId } })
if (lead?.status !== fromStatus) {
  throw new Error(`Invalid transition: lead is ${lead?.status}, expected ${fromStatus}`)
}
await prisma.lead.update({
  where: { id: leadId },
  data: { status: toStatus, statusChangedAt: new Date() }
})

// ❌ Zakázané – priama zmena bez validácie
await prisma.lead.update({ where: { id }, data: { status: 'SCORED' } })
```

### Batch job pravidlo
```typescript
const BATCH_SIZE = parseInt(process.env.AI_JOBS_BATCH_SIZE ?? '10')
const leads = await prisma.lead.findMany({
  where: { status: 'SCRAPED' },
  take: BATCH_SIZE,
  orderBy: { createdAt: 'asc' }
})
```

---

## Skill: PROJECT_ARCHITECTURE
- **Popis:** Kompletná mapa projektu. Čítaj PRED každou väčšou zmenou.

### Projekt info
```
Repozitár:    onlinovosk-bit/realitka-ai
Spoločnosť:   ONLINOVO, s. r. o.
Klient:       Reality Smolko, s. r. o. (Rastislav Smolko RSc.)
Platform:     Revolis.AI
Production:   https://app.revolis.ai
Hosting:      Vercel (onlinovosk-4317s-projects/realitka-ai)
```

### Monorepo štruktúra
```
RealitkaAI/
├── apps/
│   ├── crm/                        ← Hlavná Next.js CRM aplikácia
│   │   └── src/
│   │       ├── app/api/            ← API routes (Next.js App Router)
│   │       │   └── webhooks/realvia/route.ts
│   │       ├── lib/
│   │       │   ├── realvia/validate.ts
│   │       │   └── revolis-guard.ts
│   │       └── proxy.ts
│   ├── marketing/
│   ├── realvia-ingestion/
│   └── revenue-intelligence/
├── memory/                         ← Agent memory súbory
│   ├── skills.md                   ← tento súbor
│   ├── decisions.md
│   ├── people.md
│   ├── preferences.md
│   └── session-summary.md
└── .env.local
```

### Tech Stack
| Vrstva | Technológia |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Jazyk | TypeScript |
| Databáza | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js |
| Hosting | Vercel |
| AI | Anthropic Claude API |
| Package manager | pnpm (monorepo) |

### Externé integrácie
| Systém | Typ | Status |
|---|---|---|
| Realvia | Webhook (inbound) | ✅ Implementované 18.05.2026 |
| Domire | Export | ✅ Aktívne |
| backOFFICE | Export | ✅ Aktívne |
| Bazos.sk | Export | ⚫ Vypnuté |
| realitysmolko.sk | Export | ⚫ Vypnuté |
| Matterport | Integrácia | ✅ Aktívne |

### Kľúčové osoby
| Osoba | Rola | Kontakt |
|---|---|---|
| Andrej Ondruš | CEO / Chief AI Product Architect | andrej@revolis.ai, +421 948 444 014 |
| Rastislav Smolko RSc. | Klient / konateľ Reality Smolko | — |
| pani Bereczová | Realvia technický kontakt | — |

---

## Skill: AGENT_DECISION_RULES
- **Popis:** Pravidlá rozhodovania agenta. Keď agent nevie čo robiť – čítaj toto.

### Zlaté pravidlá (nikdy neporušiť)
```
#1 – Nikdy nezmeniť produkčné dáta bez potvrdenia
#2 – Nikdy necommitovať .env súbory
#3 – Nikdy nepísať kód bez prečítania existujúceho súboru
#4 – Nikdy neodhadovať ENV hodnoty → pozri ENV_VARIABLES_MAP
#5 – Nikdy merge, nikdy force push
```

### Konaj samostatne (bez pýtania)
- Čítanie súborov a kódu
- Linting a build
- Písanie kódu podľa existujúcich konvencií
- Opravovanie TypeScript chýb
- Aktualizácia dokumentácie

### VŽDY sa opýtaj
- Akákoľvek zmena produkčnej DB (UPDATE, DELETE)
- Merge alebo deployment
- Zmena ENV premenných na produkcii
- Odstránenie súborov
- Zmena bezpečnostnej logiky (validate.ts, revolis-guard.ts)

### Rozhodovací strom
```
Nový task → prečítaj PROJECT_ARCHITECTURE → identifikuj súbory → prečítaj ich → kóduj
Bug v produkcii → zdokumentuj → nájdi príčinu → navrhni fix → opýtaj sa pred deployom
Nový API endpoint → API_ROUTE_CONVENTION → Guard → error formát → DEPLOYMENT_CHECKLIST
Nová ENV premenná → pridaj do ENV_VARIABLES_MAP → Vercel Import .env → Redeploy
```

### Prioritizácia
```
P0 – Production je broken       → OKAMŽITE, všetko ostatné stop
P1 – Bezpečnostná diera         → Do 1 hodiny
P2 – Klientove dáta nesynkronizujú → Do 4 hodín
P3 – Feature request            → Podľa sprint plánu
P4 – Tech debt / refaktoring    → Keď je priestor
```

### Paralelné Slate Slices
Nikdy neupravovať súbory, ktoré sú v inom Slate Slice. Aktuálne slices: Billing, Team, Tasks, Settings, Contacts.

---

## Skill: SECURITY_RULES
- **Popis:** Bezpečnostné pravidlá projektu. Porušenie = incident, právna zodpovednosť, strata klientov.

### Absolútne zákazy
```
❌ Nikdy nelogovať: heslá, API kľúče, JWT tokeny, secrets
❌ Nikdy nevrátiť stack trace v production response
❌ Nikdy necommitovať credentials do gitu
❌ Nikdy nepoužívať eval()
❌ Nikdy dôverovať user inputu bez sanitácie
❌ Nikdy odstrániť withRevolisGuard bez schválenia
```

### GDPR – osobné údaje (nikdy nelogovať celé)
Meno, priezvisko, email, telefón, adresa, IP adresa.
```typescript
// ✅ Správne
console.log('[LEAD_CREATED]', { lead_id: '123', status: 'SCRAPED' })
// ❌ Zakázané
console.log('[LEAD_CREATED]', { name: 'Ján Novák', email: 'jan@example.com' })
```

### Input sanitácia – vždy Zod
```typescript
const Schema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).trim(),
})
const parsed = Schema.safeParse(body)
if (!parsed.success) {
  return errorResponse("Validation failed", parsed.error.issues.map(i => i.message))
}
```

### Webhook bezpečnosť – vrstvená ochrana
1. IP whitelist (`REALVIA_ALLOWED_IP`)
2. Auth headers (`identifikator` + `identifikator2`)
3. HTTPS only (Vercel enforces)
4. Request size limit (max 1MB)

### Secret rotation
```
REALVIA_SHARED_SECRET → každých 90 dní
ANTHROPIC_API_KEY     → pri podozrení na kompromitáciu
NEXTAUTH_SECRET       → pri zmene auth logiky
```

### Incident response
```
1. OKAMŽITE revoke/rotate kompromitované credentials
2. Informovať andrej@revolis.ai
3. Zdokumentovať → analyzovať rozsah → opraviť → post-mortem
```

---

## Skill: TYPESCRIPT_CONVENTIONS
- **Popis:** Jednotný TypeScript štandard naprieč projektom.

### Základné pravidlá
```typescript
// ✅ Vždy explicit typy
async function processLead(leadId: string): Promise<Lead> { ... }

// ❌ Nikdy any
function process(data: any) { ... }

// ✅ Interface pre objekty
interface Lead { id: string; email: string; status: LeadStatus }

// ✅ Enum pre stavy
enum LeadStatus { SCRAPED = 'SCRAPED', SCORED = 'SCORED' }
```

### Import poriadok
```typescript
// 1. Node.js built-ins
// 2. External packages (zod, next/server...)
// 3. Internal absolute imports (@lib/...)
// 4. Relatívne importy (./validate)
// Prázdny riadok medzi skupinami
```

### Null safety
```typescript
// ✅
const email = lead?.contact?.email ?? 'unknown'
if (!lead) return errorResponse("Not found", [`Lead ${id} does not exist`], 404)

// ❌
lead!.status
```

### Zod validácia – štandard
```typescript
const Schema = z.object({
  export_id: z.string(),
  type: z.enum(['property', 'lead', 'market_data']),
  action: z.enum(['create', 'update', 'delete']),
})
const parsed = Schema.safeParse(body)
if (!parsed.success) {
  return errorResponse("Invalid payload", parsed.error.issues.map(i => i.message))
}
```

### Naming conventions
```
PascalCase     → typy, interfacy, enumy, komponenty
camelCase      → premenné, funkcie, metódy
SCREAMING_CASE → konštanty (MAX_BATCH_SIZE)
kebab-case     → súbory (api-response.ts)
is/has/can     → prefix pre boolean (isActive, hasScore)
```

### Komentáre
```typescript
// ✅ Vysvetľuje PREČO, nie čo
// IP sa číta z x-forwarded-for kvôli Vercel proxy vrstve

// ✅ TODO s menom a dátumom
// TODO(andrej, 2026-05-20): Pridať retry logiku pre failed webhooky

// ❌ Zbytočný komentár
// Získaj email z body
const email = body.email
```

**Max dĺžka súboru: 300 riadkov.** Ak viac → refaktoruj.

---

## Quick Reference – Ktorý skill kedy použiť

| Situácia | Skill |
|---|---|
| Pracujem na Realvia webhoku | REALVIA_INTEGRATION |
| Pridávam ENV premennú | ENV_VARIABLES_MAP |
| Chystám sa commitovať | DEPLOYMENT_CHECKLIST |
| Píšem nový API endpoint | API_ROUTE_CONVENTION + ERROR_RESPONSE_FORMAT |
| Mením DB status záznamu | DATABASE_STATUS_FLOW |
| Neviem kde niečo je | PROJECT_ARCHITECTURE |
| Neviem čo robiť | AGENT_DECISION_RULES |
| Pracujem s user inputom | SECURITY_RULES |
| Píšem TypeScript | TYPESCRIPT_CONVENTIONS |
| Vraciam chybu z API | ERROR_RESPONSE_FORMAT |
