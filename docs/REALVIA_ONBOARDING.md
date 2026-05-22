# Realvia Integration Onboarding Guide

## Pre každého nového klienta – checklist

### Krok 1 – Realvia konfigurácia (pošlite Realvii)
```
Endpoint URL:    https://app.revolis.ai/api/webhooks/realvia
Metóda:          POST
Content-Type:    application/json
identifikator:   <REALVIA_IDENTIFIER hodnota z Vercel>
identifikator2:  <REALVIA_IDENTIFIER_2 hodnota z Vercel>
```

Realvia **neposiela** žiadny shared secret header — auth je výhradne cez `identifikator` + `identifikator2`.

### Krok 2 – Vercel ENV nastavenie (povinné)
```
REALVIA_ALLOWED_IP=185.59.208.101
REALVIA_IDENTIFIER=<hodnota>
REALVIA_IDENTIFIER_2=<hodnota>
```

Voliteľné (len manuálne testy / dev, Realvia to neposiela):
```
REALVIA_SHARED_SECRET=<openssl rand -hex 32>   # pre X-Revolis-Secret header
REALVIA_DEFAULT_AGENCY_ID=<uuid>               # fallback ak agencies row chýba
```

### Krok 3 – Testovanie (DÔLEŽITÉ: používajte súbor nie inline JSON)

**Windows PowerShell:**
```powershell
Set-Content -Path "$env:TEMP\realvia-test.json" `
  -Value '{"test": true, "export_id": "EXPORT_ID_KLIENTA"}' `
  -NoNewline -Encoding utf8

curl.exe -s -i -X POST "https://app.revolis.ai/api/webhooks/realvia" `
  -H "Content-Type: application/json" `
  -H "identifikator: HODNOTA_IDENTIFIKATORA" `
  -H "identifikator2: HODNOTA_IDENTIFIKATORA_2" `
  --data-binary "@$env:TEMP\realvia-test.json"
```

**Debug incoming headers (po deployi):**
```powershell
curl.exe -s "https://app.revolis.ai/api/webhooks/realvia?dump=headers"
```

### Krok 4 – Očakávaná odpoveď
```json
{
  "result": "ok",
  "message": "Webhook received"
}
```

Chyba auth:
```json
{
  "result": "error",
  "message": "Invalid authentication"
}
```

### Krok 5 – Overenie v Supabase
```sql
SELECT id, received_at, source_ip, payload_type, headers_json
FROM realvia_webhook_logs
ORDER BY received_at DESC
LIMIT 5;
```

---

## Časté chyby a riešenia

| Chyba | Príčina | Riešenie |
|---|---|---|
| `403 Invalid authentication` | Zlé `identifikator`/`identifikator2` | Overiť Vercel ENV vs hodnoty u Realvie |
| `403 Invalid authentication` | Chýba `REALVIA_IDENTIFIER` v ENV | Nastaviť oba identifikátory vo Vercel Production |
| `403 Source IP not in allowed list` | IP mimo whitelist | Pridať IP do `REALVIA_ALLOWED_IP` |
| `400 Invalid JSON` | PowerShell escapovanie | Použiť `--data-binary "@subor.json"` |

---

## Export ID sledovanie

| Klient | Export ID | Dátum aktivácie | Status |
|---|---|---|---|
| Reality Smolko, s.r.o. | 1423691836 | 18.05.2026 | Aktívne |

---

## Kontakty

| Systém | Kontakt |
|---|---|
| Realvia | Lýdia Bereczová (Webex) |
| Revolis.AI | Andrej Ondruš — andrej@revolis.ai |
