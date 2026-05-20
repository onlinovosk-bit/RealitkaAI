# Realvia — externý cron (každých 5 minút)

Návod pre majiteľa (Andrej): ako nastaviť externý scheduler, ktorý pravidelne spracuje frontu z Realvie v Revolis CRM.

## Čo to robí

1. **Webhook** (`POST https://app.revolis.ai/api/webhooks/realvia`) prijme zmeny z Realvie, uloží payload a zaradí job do fronty `realvia_processing_queue`.
2. **Worker** (`GET https://app.revolis.ai/api/cron/realvia-process`) každých ~5 minút spracuje čakajúce joby (inzeráty, zmazania, ceny) a zapíše ich do `properties`.

Bez externého cronu sa fronta hromadí — webhook funguje, ale nehnuteľnosti sa neaktualizujú, kým worker nebeží.

## Predpoklady

| Položka | Kde ju nájdeš |
|--------|----------------|
| **CRM URL** | `https://app.revolis.ai` (nie `revolis.ai` — to je marketing) |
| **CRON_SECRET** | Vercel → Project **realitka-ai** → Settings → Environment Variables → Production |
| **Worker URL** | `https://app.revolis.ai/api/cron/realvia-process` |
| **Webhook URL** (pre Realviu) | `https://app.revolis.ai/api/webhooks/realvia` |

> **Dôležité:** Všetky Realvia/Revolis integračné URL musia ísť na subdoménu **`app.revolis.ai`**. Doména `revolis.ai` môže vracať 404 — to je iný Vercel projekt.

---

## Možnosť A — cron-job.org (odporúčané, zadarmo)

1. Otvor [https://cron-job.org](https://cron-job.org) a prihlás sa (bezplatný účet stačí).
2. **Create cronjob**.
3. Vyplň presne:

| Pole | Hodnota |
|------|---------|
| **Title** | `Revolis Realvia queue worker` |
| **URL** | `https://app.revolis.ai/api/cron/realvia-process` |
| **Schedule** | Every **5** minutes (alebo výraz `*/5 * * * *`) |
| **Request method** | `GET` |
| **Timezone** | Europe/Bratislava (voliteľné) |

4. V sekcii **Advanced** → **Headers** pridaj jeden riadok:

| Header name | Header value |
|-------------|----------------|
| `Authorization` | `Bearer VLOŽ_CRON_SECRET_Z_VERCEL` |

Nahraď `VLOŽ_CRON_SECRET_Z_VERCEL` skutočnou hodnotou z Vercel (bez medzier, celý token).

5. Ulož a zapni cronjob (Enabled).
6. Po prvom behu skontroluj **Execution history** — očakávaný HTTP status **200** a JSON telo s poľami `processed`, `succeeded`, `failed`.

---

## Možnosť B — Upstash QStash (ak už používate Upstash)

1. V [Upstash Console](https://console.upstash.com) vytvor **Schedule** alebo **QStash** publish s intervalom 5 minút.
2. **Destination URL:** `https://app.revolis.ai/api/cron/realvia-process`
3. **Method:** `GET`
4. **Header:** `Authorization: Bearer <CRON_SECRET>`
5. Ulož a over prvý delivery v logoch (status 200).

Dokumentácia Upstash sa mení — kľúčové je: GET + Bearer header, nie POST bez auth.

---

## Možnosť C — natívny Vercel Cron (len Pro)

Na pláne **Hobby** Vercel **nepovolí** cron častejší ako raz za hodinu (napr. `*/5` v `vercel.json` zlyhá pri deployi).

Ak chcete cron priamo vo Vercel:

1. Upgrade projektu na **Pro**.
2. Do `vercel.json` pridajte cron s cestou `/api/cron/realvia-process` a schedule `*/5 * * * *`.
3. Vercel pri volaní cron route automaticky posiela `Authorization: Bearer <CRON_SECRET>` — route to už očakáva.

Pre Hobby zostávajte pri **Možnosti A** alebo **B**.

---

## Overenie po deployi PR

### 1. Manuálny smoke test (PowerShell / terminál)

Nahraď `TVÓJ_CRON_SECRET` hodnotou z Vercel:

```bash
curl -s -H "Authorization: Bearer TVÓJ_CRON_SECRET" "https://app.revolis.ai/api/cron/realvia-process"
```

**Očakávaná odpoveď (200):**

```json
{
  "ok": true,
  "processed": 0,
  "succeeded": 0,
  "failed": 0,
  "durationMs": 12,
  "results": []
}
```

Ak sú vo fronte joby, `processed` a `succeeded` budú > 0.

### 2. Health webhooku (bez secretu — len či route existuje)

```bash
curl -s -o /dev/null -w "%{http_code}" "https://app.revolis.ai/api/webhooks/realvia"
```

- **405** (Method Not Allowed) na GET je v poriadku — route existuje, očakáva POST od Realvie.
- **404** = route ešte nie je nasadená alebo zlá doména (`revolis.ai` namiesto `app.revolis.ai`).

### 3. Kontrola v CRM / DB

- V Supabase: tabuľka `realvia_processing_queue` — stavy `pending` by mali klesať na `completed` / `failed`.
- V aplikácii: **Nehnuteľnosti** — počet a aktualizácie z Realvie by mali pribúdať po behoch workera.

---

## Riešenie problémov

| Symptóm | Pravdepodobná príčina | Čo urobiť |
|---------|----------------------|-----------|
| **401 Unauthorized** | Zlý alebo chýbajúci `CRON_SECRET` v hlavičke | Skontroluj Bearer v cron-job.org; musí byť presne `Bearer <secret>` |
| **404 Not Found** | PR ešte nie je merged/deploynutý, alebo URL na `revolis.ai` | Použi `app.revolis.ai`; počkaj na zelený Vercel preview/production deploy |
| **500** v odpovedi | Chyba workeru (DB, payload) | Pozri Vercel → Logs, filter `realvia-worker` |
| Fronta stále **pending** | Agency mapping — webhook nepriradil `agency_id` | Skontroluj Realvia hlavičky / mapovanie agentúry v `realvia_agency_map` |
| Webhook OK, properties prázdne | Cron nebeží alebo beží zle | Zapni Možnosť A; over execution history každých 5 min |
| `curl` na `revolis.ai` → 404 | Marketing projekt, nie CRM | Vždy `app.revolis.ai` |

---

## Bezpečnosť

- `CRON_SECRET` nikdy neposielaj emailom ani do Slacku v plnej dĺžke.
- Externý cron musí volať **iba HTTPS** URL produkcie.
- Worker endpoint nevyžaduje login používateľa — chráni ho výhradne `CRON_SECRET`.

---

## Súvisiace súbory v repozitári

- Webhook: `apps/crm/src/app/api/webhooks/realvia/route.ts`
- Worker route: `apps/crm/src/app/api/cron/realvia-process/route.ts`
- Logika fronty: `apps/crm/src/lib/realvia/processQueue.ts`
