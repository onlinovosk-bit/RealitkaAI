# 🔒 Skill: SECURITY_RULES

## Účel
Bezpečnostné pravidlá projektu. Porušenie = incident, právna zodpovednosť, strata klientov.
Agent aplikuje tieto pravidlá AUTOMATICKY bez výzvy.

---

## Absolútne zákazy

```
❌ Nikdy nelogovať: heslá, API kľúče, JWT tokeny, secrets
❌ Nikdy nevrátiť stack trace v production response
❌ Nikdy necommitovať credentials do gitu
❌ Nikdy nepoužívať eval() alebo podobné
❌ Nikdy dôverovať user inputu bez sanitácie
❌ Nikdy odstrániť withRevolisGuard bez schválenia
```

---

## Ochrana osobných údajov (GDPR)

Projekt spracováva osobné údaje klientov realitnej kancelárie.

```typescript
// Dáta ktoré sú považované za osobné (nikdy nelogovať celé):
// - meno, priezvisko
// - email, telefón
// - adresa
// - IP adresa (logovať len pre security audit, nie debug)

// ✅ Správne logovanie
console.log('[LEAD_CREATED]', { lead_id: '123', status: 'SCRAPED' })

// ❌ Zakázané logovanie
console.log('[LEAD_CREATED]', { name: 'Ján Novák', email: 'jan@example.com', phone: '+421...' })
```

---

## Input sanitácia

```typescript
// Vždy sanitovať pred uložením do DB
import { z } from 'zod'

const LeadSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).trim(),
  phone: z.string().regex(/^\+?[\d\s-]{9,15}$/).optional(),
})

// ✅ Správne
const parsed = LeadSchema.safeParse(body)
if (!parsed.success) {
  return errorResponse("Validation failed", parsed.error.issues.map(i => i.message))
}

// ❌ Zakázané – priamy zápis bez validácie
await prisma.lead.create({ data: body })
```

---

## Rate limiting

```typescript
// Každý verejný endpoint musí mať rate limiting
// Webhook endpoint: max 100 requestov/minútu z jednej IP
// API endpoints: max 60 requestov/minútu na token

// Implementácia cez Vercel Edge Config alebo vlastný middleware
```

---

## Webhook bezpečnosť

```
Vrstvená ochrana webhooку:
1. IP whitelist (REALVIA_ALLOWED_IP)
2. Auth headers (identifikator + identifikator2)
3. HTTPS only (Vercel enforces)
4. Request size limit
```

```typescript
// Vždy kontrolovať veľkosť requestu
const body = await req.text()
if (body.length > 1_000_000) { // 1MB limit
  return errorResponse("Payload too large", ["Max size: 1MB"], 413)
}
```

---

## Secret rotation

```
REALVIA_SHARED_SECRET: rotovať každých 90 dní
ANTHROPIC_API_KEY: rotovať pri podozrení na kompromitáciu
NEXTAUTH_SECRET: rotovať pri zmene auth logiky
```

Postup rotácie:
1. Vygenerovať nový secret (`openssl rand -hex 32`)
2. Nastaviť vo Vercel
3. Redeploy
4. Potvrdiť fungovanie
5. Informovať partnera (ak relevantné)

---

## SQL Injection prevencia

```typescript
// Prisma automaticky escapuje hodnoty – vždy používať Prisma
// ✅ Bezpečné
await prisma.lead.findMany({ where: { email: userInput } })

// ❌ NIKDY nepoužívať raw SQL s user inputom
await prisma.$queryRaw`SELECT * FROM leads WHERE email = ${userInput}` // NEBEZPEČNÉ
// Ak raw SQL je nutný → použiť Prisma.sql template
await prisma.$queryRaw(Prisma.sql`SELECT * FROM leads WHERE email = ${userInput}`) // OK
```

---

## Security Headers

```typescript
// middleware.ts – pridať security headers
const headers = new Headers(response.headers)
headers.set('X-Content-Type-Options', 'nosniff')
headers.set('X-Frame-Options', 'DENY')
headers.set('X-XSS-Protection', '1; mode=block')
headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
```

---

## Incident response

Ak sa objaví bezpečnostný incident:

```
1. OKAMŽITE revoke/rotate kompromitované credentials
2. Informovať Andreja Ondruša (andrej@revolis.ai)
3. Zdokumentovať čo sa stalo
4. Analyzovať rozsah
5. Opraviť
6. Post-mortem
```
