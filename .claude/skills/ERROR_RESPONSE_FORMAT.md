# ⚠️ Skill: ERROR_RESPONSE_FORMAT

## Účel
Jeden štandardný formát chybových odpovedí naprieč celým projektom.
Konzistentnosť = frontend vie vždy čo čakať = menej bugov = spokojní klienti.

---

## Zlaté pravidlo

```
KAŽDÁ chybová odpoveď = { error: string, details: string[] }
NIKDY inak.
```

---

## TypeScript typy

```typescript
// Definícia (apps/crm/src/types/api.ts)
export interface ApiErrorResponse {
  error: string           // Krátky, ľudsky čitateľný popis
  details: string[]       // Pole konkrétnych detailov
  code?: string           // Voliteľný machine-readable kód
  requestId?: string      // Voliteľné ID pre debugging
}

export interface ApiSuccessResponse<T = unknown> {
  data: T
  meta?: {
    total?: number
    page?: number
    limit?: number
  }
}
```

---

## Helper funkcie

```typescript
// apps/crm/src/lib/api-response.ts

export function errorResponse(
  error: string,
  details: string[],
  status: number = 400
): Response {
  return Response.json({ error, details }, { status })
}

export function successResponse<T>(data: T, status: number = 200): Response {
  return Response.json({ data }, { status })
}

// Použitie:
return errorResponse("Forbidden", ["Source IP not in allowed list"], 403)
return successResponse({ lead_id: "123", status: "created" }, 201)
```

---

## Katalóg štandardných chýb

### Auth / Security
```json
{ "error": "Unauthorized", "details": ["Missing or invalid authentication"] }
{ "error": "Forbidden", "details": ["Source IP 1.2.3.4 not in allowed list"] }
{ "error": "Forbidden", "details": ["Missing authentication headers"] }
{ "error": "Token expired", "details": ["Session expired, please login again"] }
```

### Validácia
```json
{ "error": "Validation failed", "details": ["Missing field: email", "Invalid format: phone"] }
{ "error": "Invalid request", "details": ["Body must be valid JSON"] }
{ "error": "Required field missing", "details": ["export_id is required"] }
```

### Dáta
```json
{ "error": "Not found", "details": ["Lead ID 123 does not exist"] }
{ "error": "Conflict", "details": ["Property with ID 456 already exists"] }
{ "error": "Gone", "details": ["This record was deleted on 2026-05-18"] }
```

### Server
```json
{ "error": "Internal server error", "details": ["Unexpected error, contact support"] }
{ "error": "Service unavailable", "details": ["Database connection failed"] }
{ "error": "Timeout", "details": ["Request took too long, try again"] }
```

---

## Frontend – ako spracovať

```typescript
// React / Next.js
const res = await fetch('/api/leads', { method: 'POST', body: JSON.stringify(data) })

if (!res.ok) {
  const err = await res.json() as ApiErrorResponse
  // err.error = hlavná správa pre UI
  // err.details = zoznam pre detailný výpis
  toast.error(err.error)
  setErrors(err.details)
  return
}

const { data: lead } = await res.json() as ApiSuccessResponse<Lead>
```

---

## Čo NIKDY nerobiť

```typescript
// ❌ Plain string
return new Response("Unauthorized", { status: 401 })

// ❌ Nekonzistentný kľúč
return Response.json({ message: "error occurred" }, { status: 400 })

// ❌ Detail v stringu namiesto poľa
return Response.json({ error: "Failed: missing email", details: "check your input" })

// ❌ Stack trace v produkcii
return Response.json({ error: err.message, stack: err.stack }, { status: 500 })

// ✅ Správne vždy
return Response.json({
  error: "Validation failed",
  details: ["Missing field: email"]
}, { status: 400 })
```

---

## Logging chýb

```typescript
// Server-side: vždy logovať 5xx errory
if (status >= 500) {
  console.error('[API_ERROR]', {
    timestamp: new Date().toISOString(),
    error,
    details,
    // Nikdy nelogovať sensitívne dáta
  })
}
```
