# Stealth Recruiter — Prešov ingest (externý cron)

Cron dopĺňa tabuľku `stealth_recruiter_prospects` reálnymi samopredajcami z Bazoš RSS (kraj Prešovský + hľadanie Prešov). UI scan (`POST /api/stealth-recruiter/scan`) potom číta DB — bez demo dát a s `STEALTH_RECRUITER_DEMO_MODE=false` na produkcii.

## Predpoklady

| Položka | Hodnota |
|--------|---------|
| **CRM URL** | `https://app.revolis.ai` |
| **CRON_SECRET** | Vercel → Environment Variables (rovnaký ako `realvia-process`) |
| **Endpoint** | `GET /api/cron/stealth-recruiter-ingest` |
| **STEALTH_RECRUITER_DEMO_MODE** | `false` na Production (Preview voliteľne `true` pre demo) |

Voliteľné premenné:

| Premenná | Účel |
|----------|------|
| `STEALTH_RECRUITER_AGENCY_SLUG` | Default slug ak chýba `agency_slug` v URL (default `reality-smolko`) |
| `STEALTH_RECRUITER_DEFAULT_AGENCY_ID` | Fallback UUID ak slug v DB neexistuje |

## Externý scheduler (každých 6 hodín)

1. [cron-job.org](https://cron-job.org) → **Create cronjob**
2. URL: `https://app.revolis.ai/api/cron/stealth-recruiter-ingest?region=Prešov`
3. Schedule: `0 */6 * * *` (alebo „Every 6 hours“)
4. Method: `GET`
5. Header: `Authorization: Bearer <CRON_SECRET>`

Query parametre:

- `region` — default `Prešov`
- `agency_id` — explicitné UUID agentúry
- `agency_slug` — napr. `reality-smolko` (ak nie je `agency_id`)

## Manuálny smoke test

PowerShell:

```powershell
$secret = "TVÓJ_CRON_SECRET"
Invoke-RestMethod -Uri "https://app.revolis.ai/api/cron/stealth-recruiter-ingest?region=Prešov" `
  -Headers @{ Authorization = "Bearer $secret" }
```

curl:

```bash
curl -s -H "Authorization: Bearer TVÓJ_CRON_SECRET" \
  "https://app.revolis.ai/api/cron/stealth-recruiter-ingest?region=Prešov"
```

Očakávaná odpoveď (200):

```json
{
  "ok": true,
  "region": "Prešov",
  "source": "bazos_sk",
  "agency_id": "...",
  "inserted": 3,
  "updated": 1,
  "upserted": 4,
  "errors": []
}
```

## Overenie v Supabase

```sql
SELECT address, region, platform, days_listed, score, status, verified_at, scraped_at
FROM public.stealth_recruiter_prospects
WHERE agency_id = '11111111-1111-1111-1111-111111111111'
  AND region ILIKE 'Prešov'
ORDER BY verified_at DESC
LIMIT 20;
```

## Produkcia — checklist

1. Aplikovať migráciu `20260531120000_stealth_recruiter_prospects_repair.sql` (oprava `scraped_at` / chýbajúcich stĺpcov).
2. Vercel: `STEALTH_RECRUITER_DEMO_MODE=false`, `CRON_SECRET` nastavený.
3. Deploy PR, potom zapnúť externý cron (6h).
4. Po prvom behu overiť SQL vyššie a scan v CRM s `onlyToday: true`.

## Súvisiace súbory

- Ingest: `apps/crm/src/lib/stealth-recruiter/ingest-presov.ts`
- Cron route: `apps/crm/src/app/api/cron/stealth-recruiter-ingest/route.ts`
- Scan API: `apps/crm/src/app/api/stealth-recruiter/scan/route.ts`
- Bazoš RSS parser: `apps/crm/src/lib/arbitrage/parsers/bazos-parser.ts`
