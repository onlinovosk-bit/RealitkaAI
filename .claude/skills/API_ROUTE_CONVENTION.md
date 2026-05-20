# 🛡️ Skill: API_ROUTE_CONVENTION

## Účel
Štandardy pre každý API endpoint v projekte. Porušenie = bezpečnostná diera alebo broken production.
Agent musí tieto pravidlá aplikovať AUTOMATICKY bez pýtania.

---

## KRITICKÉ PRAVIDLO #1 – Revolis Guard

```
Každý súbor v /api MUSÍ importovať @lib/revolis-guard
```

```typescript
// ✅ SPRÁVNE
import { withRevolisGuard } from '@lib/revolis-guard'

export const POST = withRevolisGuard(async (req) => {
  // tvoj kód
})

// ❌ ZAKÁZANÉ – žiadny guard
export async function POST(req: Request) {
  // priamy handler bez ochrany
}
```

**Výnimky z Guard pravidla:**
- `/api/webhooks/*` – má vlastnú validáciu (validate.ts)
- `/api/health` – verejný health check
- `/api/auth/*` – NextAuth.js routes

---

## KRITICKÉ PRAVIDLO #2 – Error Response Formát

Všetky chyby MUSIA vracať tento formát:

```typescript
// Štandard
return Response.json({
  error: "Popis chyby (ľudsky čitateľný)",
  details: ["Detail 1", "Detail 2"]  // pole, nie string
}, { status: 400 })

// ✅ Správne príklady
{ "error": "Forbidden", "details": ["Source IP not in allowed list"] }
{ "error": "Validation failed", "details": ["Missing field: email", "Invalid format: phone"] }
{ "error": "Not found", "details": ["Lead ID 123 does not exist"] }

// ❌ Zakázané
{ "message": "error" }        // nekonzistentný kľúč
{ "error": "chyba: detail" }  // detail v stringu, nie v poli
"Unauthorized"                 // plain string
```

---

## KRITICKÉ PRAVIDLO #3 – HTTP Status kódy

| Situácia | Status kód |
|---|---|
| Úspech (dáta) | `200` |
| Vytvorený záznam | `201` |
| Úspech (bez dát) | `204` |
| Chybný request | `400` |
| Neautorizovaný | `401` |
| Zakázaný (auth OK, perm nie) | `403` |
| Nenájdené | `404` |
| Server error | `500` |

---

## Štruktúra API route súboru

```typescript
// apps/crm/src/app/api/[nazov]/route.ts

import { withRevolisGuard } from '@lib/revolis-guard'
import { NextRequest } from 'next/server'

// Vždy exportovať named exports pre každú HTTP metódu
export const GET = withRevolisGuard(async (req: NextRequest) => {
  try {
    // logika
    return Response.json({ data: result })
  } catch (error) {
    return Response.json(
      { error: "Internal server error", details: [String(error)] },
      { status: 500 }
    )
  }
})

export const POST = withRevolisGuard(async (req: NextRequest) => {
  const body = await req.json()
  // validácia + logika
})
```

---

## Štruktúra adresárov

```
apps/crm/src/app/api/
├── webhooks/
│   └── realvia/
│       └── route.ts     ← vlastná validácia, bez Guard
├── leads/
│   └── route.ts         ← Guard povinný
├── properties/
│   └── route.ts         ← Guard povinný
└── health/
    └── route.ts         ← verejný, bez Guard
```

---

## Validácia vstupných dát

Vždy validovať body pred spracovaním:

```typescript
// Minimálna validácia
const body = await req.json()
if (!body.email || !body.name) {
  return Response.json({
    error: "Validation failed",
    details: [
      !body.email ? "Missing field: email" : null,
      !body.name ? "Missing field: name" : null,
    ].filter(Boolean)
  }, { status: 400 })
}
```

---

## Logging štandard

```typescript
// Vždy logovať vstup a výstup webhooku
console.log('[REALVIA_WEBHOOK]', {
  timestamp: new Date().toISOString(),
  ip: req.headers.get('x-forwarded-for'),
  action: body.action,
  export_id: body.export_id
})
```

**Nikdy nelogovať:** heslá, API kľúče, celé JWT tokeny, REALVIA_SHARED_SECRET
