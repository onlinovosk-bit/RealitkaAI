# Integrations — Live Status

> Posledná aktualizácia: 2026-05-22 | Ruflo overnight handoff

## Realvia Export v2 (P0)

| Položka | Hodnota |
|---------|---------|
| **Webhook URL** | `https://app.revolis.ai/api/webhooks/realvia` |
| **Worker cron** | `GET https://app.revolis.ai/api/cron/realvia-process` (Bearer CRON_SECRET, každých 5 min) |
| **Klient** | Reality Smolko, s.r.o. |
| **Export ID** | 1423691836 |
| **Realvia kontakt** | Lýdia Bereczová (Webex) |
| **Status** | Integration watch — response contract fixed, čaká re-test od Realvie |

### Nasadené PR (main)

| PR | Zmena | Merge |
|----|-------|-------|
| #58 | `{ result, message }` response contract | ✅ |
| #59 | Delete payload `action: delete` + archiveType → status | ✅ |
| #60 | Unified auth message `Invalid authentication` | ✅ |

### Response contract (všetky POST scenáre)

```json
{ "result": "ok"|"error", "message": "..." }
```

| Scenár | HTTP | message |
|--------|------|---------|
| Success | 200 | `Webhook received` |
| Auth fail | 403 | `Invalid authentication` |
| Invalid JSON | 400 | `Invalid JSON` |
| Payload too large | 413 | `Payload too large` |
| Storage fail | 500 | `Internal storage error` |
| Unhandled | 500 | `Internal server error` |

### Kľúčové súbory

- `apps/crm/src/app/api/webhooks/realvia/route.ts` — webhook ingress
- `apps/crm/src/lib/realvia/validate.ts` — auth + IP
- `apps/crm/src/lib/realvia/responses.ts` — contract helpers
- `apps/crm/src/lib/realvia/processQueue.ts` — async worker
- `apps/crm/src/lib/realvia/types.ts` — payload guards

### Známe otvorené riziká

1. `resolveAgency.ts` — fallback na default agency ak chýba identifikátor v DB
2. Property lookup len podľa `source_id` (bez agency filtra)
3. Vercel preview deploy občas fail (CI build pass) — produkcia OK
4. `/api/realvia/import` — XML route loguje, nepersistuje

### Smoke test (PowerShell)

```powershell
# Health
curl.exe -i --max-time 20 https://app.revolis.ai/api/webhooks/realvia

# Auth fail (unified message po PR #60)
curl.exe -s -X POST https://app.revolis.ai/api/webhooks/realvia `
  -H "Content-Type: application/json" -d "{}"
# Očakávané: {"result":"error","message":"Invalid authentication"}
```
