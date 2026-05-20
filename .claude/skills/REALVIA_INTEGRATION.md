# 🔗 Skill: REALVIA_INTEGRATION

## Účel
Kompletná dokumentácia Realvia webhook integrácie pre projekt RealitkaAI / Revolis.
Agent NESMIE čítať zdrojový kód pri každom requeste – všetko je tu.

---

## Architektúra

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

---

## Súbory – čo je kde

| Súbor | Účel |
|---|---|
| `apps/crm/src/app/api/webhooks/realvia/route.ts` | Next.js API route, prijíma POST |
| `apps/crm/src/lib/realvia/validate.ts` | IP whitelist + header autentifikácia |
| `apps/crm/src/proxy.ts` | Bypass autorizácie pre webhook endpoint |

---

## ENV Premenné – kompletný zoznam

| Premenná | Popis | Príklad hodnoty |
|---|---|---|
| `REALVIA_ALLOWED_IP` | Comma-separated IP adresy Realvia serverov | `185.59.208.101,1.2.3.4` |
| `REALVIA_IDENTIFIER` | Hodnota hlavičky `identifikator` | `<REALVIA_IDENTIFIER>` |
| `REALVIA_IDENTIFIER_2` | Hodnota hlavičky `identifikator2` | `<REALVIA_IDENTIFIER_2>` |
| `REALVIA_SHARED_SECRET` | Fallback secret pre `x-revolis-secret` header | `<64-char hex>` |

**Nikdy necommitovať do gitu. Nastavujú sa výhradne vo Vercel → Environment Variables → Production.**

---

## Validačná logika (validate.ts)

### Krok 1 – IP kontrola
IP sa číta v tomto poradí hlavičiek:
1. `x-forwarded-for`
2. `x-real-ip`
3. `cf-connecting-ip`

Porovnáva sa s `REALVIA_ALLOWED_IP` (default: `185.59.208.101`).

### Krok 2 – Autentifikácia (Mód A alebo B)

**Mód A – Realvia native headers (preferovaný):**
```
identifikator: <REALVIA_IDENTIFIER>
identifikator2: <REALVIA_IDENTIFIER_2>
```

**Mód B – Revolis fallback:**
```
x-revolis-secret: <REALVIA_SHARED_SECRET>
```

⚠️ Identifikátory sa posielajú ako **HTTP HEADERS**, NIE v JSON body!

---

## Správny testovací curl

```bash
# Lokálny test (obíde IP whitelist len ak je IP povolená)
curl -X POST https://app.revolis.ai/api/webhooks/realvia \
  -H "Content-Type: application/json" \
  -H "identifikator: <REALVIA_IDENTIFIER>" \
  -H "identifikator2: <REALVIA_IDENTIFIER_2>" \
  -d '{"test": true}'
```

### Očakávané response kódy

| Kód | Význam | Akcia |
|---|---|---|
| `200 OK` | ✅ Funguje | - |
| `401/403` | IP nie je v whitelist alebo chýbajú headers | Skontrolovať ENV |
| `404` | Route neexistuje | Skontrolovať deploy |
| `502/503` | Server down | Skontrolovať Vercel deployment |

---

## Export ID

Realvia identifikuje klienta cez **Export ID: 1423691836** (Reality Smolko, s. r. o.)

---

## Čo Realvia posiela (očakávaná štruktúra)

```json
{
  "export_id": "1423691836",
  "type": "property" | "lead" | "market_data",
  "action": "create" | "update" | "delete",
  "data": { ... },
  "timestamp": "ISO8601"
}
```

---

## Troubleshooting

| Problém | Riešenie |
|---|---|
| `Source IP not in allowed list` | Pridať Realvia IP do `REALVIA_ALLOWED_IP` |
| `Missing authentication headers` | Overiť že Realvia posiela headers, nie body |
| `No environment variables were created` (Vercel) | Použiť "Import .env" tlačidlo, nie manuálne zadávanie |
| Endpoint nereaguje | Skontrolovať Vercel deployment status |

---

## Kontakt Realvia

- **Kontaktná osoba:** pani Bereczová
- **Implementované:** 18.05.2026
- **Email thread subject:** `RE: Webhook integrácia – Reality Smolko / Export ID: 1423691836`
