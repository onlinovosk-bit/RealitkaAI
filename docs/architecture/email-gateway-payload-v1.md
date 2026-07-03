# Email Gateway Payload — verzia 1

> **Účel:** Kanonický kontrakt medzi Cloudflare Email Worker (`workers/email-gateway`) a CRM endpointom `POST /api/acquire/email`. Worker prijíma prichádzajúci e-mail, vyhľadá mailbox v Supabase, zostaví JSON payload a forwarduje ho do CRM. CRM overí shared secret, parsuje lead a vloží ho do `leads` (s deduplikáciou).

**Zdrojová pravda (implementácia):**

| Komponent | Súbor |
|-----------|-------|
| Worker | `workers/email-gateway/src/index.js` |
| CRM route | `apps/crm/src/app/api/acquire/email/route.ts` |
| Verifikácia | `apps/crm/tests/verification/acquire-email-gateway.verification.test.ts` |

**Endpoint CRM:** `https://app.revolis.ai/api/acquire/email`  
**`CONTRACT_VERSION` / `SUPPORTED_VERSION`:** `1`

---

## Tok (high-level)

```
Inbound email → Cloudflare Email Worker
  → Supabase lookup (inbound_mailboxes)
  → POST JSON payload + headers → CRM /api/acquire/email
  → parseEmail / dedup / insert lead
```

`agencyId` pochádza z mapovania mailboxu vo Workeri (`payload.mailbox.agencyId`), nie z parsovania obsahu e-mailu.

---

## Request — HTTP hlavičky

| Header | Povinný | Popis |
|--------|---------|-------|
| `Content-Type` | áno | Musí byť `application/json`. |
| `X-Shared-Secret` | áno | Hodnota musí zodpovedať `ACQUIRE_SHARED_SECRET` (timing-safe porovnanie na CRM strane). |
| `X-Revolis-Request-Id` | odporúčaný | UUID generovaný Workerom; používa sa v logoch na oboch stranách. Ak chýba, CRM použije `"unknown"`. |

---

## Request — JSON schema (verzia 1)

### Koreňový objekt

| Pole | Typ | Povinné | Popis |
|------|-----|---------|-------|
| `version` | `number` | **áno** | Musí byť presne `1`. Iná hodnota → `400 unsupported_version`. |
| `source` | `string` | nie* | Worker posiela `"cloudflare-email-worker"`. CRM ho nevaliduje. |
| `requestId` | `string` (UUID) | nie* | ID požiadavky; duplikuje sa v hlavičke `X-Revolis-Request-Id`. |
| `receivedAt` | `string` (ISO 8601) | nie | Čas prijatia e-mailu Workerom. Fallback v CRM: aktuálny dátum (slice na `YYYY-MM-DD` pre parser). |
| `mailbox` | `object` | **áno** | Identifikácia cieľovej schránky a agentúry. |
| `email` | `object` | **áno** | Parsovaný obsah e-mailu. |

\*Worker tieto polia vždy posiela; CRM ich explicitne nevyžaduje okrem `version`, `mailbox.agencyId` a aspoň jedného z `email.text` / `email.subject` / `email.html`.

### `mailbox`

| Pole | Typ | Povinné | Popis |
|------|-----|---------|-------|
| `id` | `string` (UUID) | nie* | ID riadku v `inbound_mailboxes`. |
| `agencyId` | `string` (UUID) | **áno** | Agentúra, pod ktorú sa lead zapíše. |

### `email`

| Pole | Typ | Povinné | Popis |
|------|-----|---------|-------|
| `from` | `string` | nie | Adresa odosielateľa (`parsed.from.address` alebo `message.from`). |
| `to` | `string` | nie | Cieľová adresa (recipient). Používa sa na update `inbound_mailboxes.last_received_at`. |
| `subject` | `string` | podmienene | Aspoň jedno z `subject`, `text`, `html` musí byť neprázdne. |
| `text` | `string` | podmienene | Plain-text telo. |
| `html` | `string` | podmienene | HTML telo. |
| `messageId` | `string` | nie | Message-ID hlavička. |

**Validácia `missing_fields` (CRM):** chýba `mailbox.agencyId` **alebo** sú súčasne prázdne `email.text`, `email.subject` aj `email.html`.

---

## Autentifikácia — `ACQUIRE_SHARED_SECRET`

| Prostredie | Kde nastaviť |
|------------|--------------|
| Cloudflare Worker | `npx wrangler secret put ACQUIRE_SHARED_SECRET` |
| CRM (Vercel / lokálne) | env premenná `ACQUIRE_SHARED_SECRET` |

- CRM porovnáva hlavičku `x-shared-secret` proti `process.env.ACQUIRE_SHARED_SECRET` (po `.trim()`).
- Ak env nie je nastavená → `503 gateway_not_configured`.
- Ak secret chýba alebo nesedí → `401 unauthorized`.
- Endpoint `/api/acquire/email` je v middleware/proxy mimo session auth (verejný webhook s shared-secret ochranou).

---

## CRM — HTTP response kódy a telá

### Úspech — lead vytvorený (`200`)

```json
{
  "ok": true,
  "lead_created": true,
  "lead_id": "<uuid>",
  "event_id": "<string>"
}
```

### Úspech — bez nového leadu (`200`)

CRM vráti `ok: true` aj keď sa lead nevytvorí (duplikát alebo obsah nie je lead):

```json
{
  "ok": true,
  "lead_created": false,
  "reason": "duplicate",
  "event_id": "<string>"
}
```

```json
{
  "ok": true,
  "lead_created": false,
  "reason": "not_a_lead",
  "event_id": "<string>"
}
```

| `reason` | Význam |
|----------|--------|
| `duplicate` | `dedupKey` už existuje v `acquire_dedup_keys`. |
| `not_a_lead` | Parser/adapter nenašiel kandidáta na lead. |

### Chyby klienta (`400`)

| `error` | Podmienka |
|---------|-----------|
| `invalid_json` | Telo nie je platný JSON. |
| `unsupported_version` | `payload.version !== 1`. |
| `missing_fields` | Chýba `agencyId` alebo obsah e-mailu. |

```json
{ "ok": false, "error": "invalid_json" }
```

### Chyby autentifikácie / konfigurácie

| HTTP | `error` | Podmienka |
|------|---------|-----------|
| `401` | `unauthorized` | Chýbajúci alebo nesprávny `X-Shared-Secret`. |
| `503` | `gateway_not_configured` | `ACQUIRE_SHARED_SECRET` nie je nastavený v CRM. |
| `503` | `db_unavailable` | Supabase service-role klient nie je dostupný. |

### Chyby servera (`500`)

```json
{ "ok": false, "error": "<message>" }
```

Napr. chyba pri `INSERT` do `leads`, alebo neočakávaná výnimka (`String(e)`).

### CRM — interné log stavy (server)

| `status` | Kedy |
|----------|------|
| `LEAD_CREATED` | Lead úspešne vložený. |
| `NOT_A_LEAD` | `lead_created: false` (duplikát alebo not_a_lead). |

---

## Worker — log stavy

Worker loguje jednoradkový JSON do `console.log`. Worker **nevracia** HTTP odpoveď odosielateľovi e-mailu (Email Routing handler).

| `status` | Kedy | Ďalšie polia |
|----------|------|--------------|
| `LOOKUP_ERROR` | Supabase lookup `inbound_mailboxes` zlyhal | `requestId`, `recipient`, `httpStatus` |
| `NOT_FOUND` | Žiadny mailbox pre `recipient` | `requestId`, `recipient` |
| `DISABLED` | Mailbox existuje, `active === false` | `requestId`, `recipient`, `mailboxId` |
| `FORWARDED` | CRM odpovedal `res.ok` | `requestId`, `recipient`, `agencyId`, `httpStatus`, `responseBody` (max 500 znakov) |
| `GATEWAY_ERROR` | CRM odpovedal `!res.ok` | rovnaké ako `FORWARDED` |
| `EXCEPTION` | Neočakávaná výnimka v `try/catch` | `requestId`, `recipient`, `error` |

---

## Príklad — request

```http
POST /api/acquire/email HTTP/1.1
Host: app.revolis.ai
Content-Type: application/json
X-Shared-Secret: <ACQUIRE_SHARED_SECRET>
X-Revolis-Request-Id: 550e8400-e29b-41d4-a716-446655440000
```

```json
{
  "version": 1,
  "source": "cloudflare-email-worker",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "receivedAt": "2026-07-03T08:58:00.000Z",
  "mailbox": {
    "id": "22222222-2222-2222-2222-222222222222",
    "agencyId": "11111111-1111-1111-1111-111111111111"
  },
  "email": {
    "from": "klient@example.sk",
    "to": "smolko@inbound.revolis.ai",
    "subject": "Záujem o 3-izbový byt v Bratislave",
    "text": "Dobrý deň, hľadám byt do 250 000 €. Kontakt: Jan Novak, +421900123456, jan@example.sk",
    "html": "",
    "messageId": "<abc@mail.example.sk>"
  }
}
```

## Príklad — response (lead vytvorený)

```json
{
  "ok": true,
  "lead_created": true,
  "lead_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "event_id": "evt_20260703_abc123"
}
```

## Príklad — response (duplikát)

```json
{
  "ok": true,
  "lead_created": false,
  "reason": "duplicate",
  "event_id": "evt_20260703_abc123"
}
```

## Príklad — response (neautorizovaný)

```http
HTTP/1.1 401 Unauthorized
```

```json
{
  "ok": false,
  "error": "unauthorized"
}
```

---

## Verziovanie

1. **`version` v JSON tele** je jediný formálny identifikátor kontraktu. Aktuálne podporovaná hodnota: **`1`**.
2. **Breaking zmena** (iná štruktúra polí, iná sémantika) → inkrementuj `version` na `2`, aktualizuj `SUPPORTED_VERSION` v CRM a `CONTRACT_VERSION` vo Workeri v **tom istom deploye**.
3. **Additive zmena** v rámci v1 (nové voliteľné polia, ktoré starý consumer ignoruje) → ponechaj `version: 1`; dokumentuj tu.
4. CRM pri nepodporovanej verzii vracia `400` s `error: "unsupported_version"` — Worker by mal logovať `GATEWAY_ERROR`.
5. Starý Resend webhook + `svix` podpis flow je nahradený týmto kontraktom (overené v `acquire-email-gateway.verification.test.ts`).

---

## Poznámka po audite (wave 1)

Tento dokument bol pridaný **additive** po dokončení email-gateway wave 1 (`email-gateway-acquire-wave1`, manifest `.ruflo/manifest-email-gateway-wave1.yaml`). Neobsahuje zmeny kódu — slúži ako živá špecifikácia kontraktu pre review, onboarding a budúce wave 2 úpravy (route, proxy bypass, DNS/Resend).

**Overené správanie (verification test):**

- Route prijíma JSON (`req.json()`), nie raw text.
- Auth cez `ACQUIRE_SHARED_SECRET` / `x-shared-secret`.
- `agencyId` z `payload.mailbox.agencyId`, nie z `agencyForInbound()`.
- `/api/acquire/email` je mimo session auth v `middleware.ts` a `proxy.ts`.
