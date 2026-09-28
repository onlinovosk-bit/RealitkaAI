# GO MERGE 507 + GO SQL — customer-health

**Project:** `ypgajkhqtbriqqmyawyv` (ACTIVE_HEALTHY)  
**When:** 2026-09-03

## Merge #507

Auto-merge už prebehol pred týmto GO.

| | |
|---|---|
| PR | https://github.com/onlinovosk-bit/RealitkaAI/pull/507 |
| Merge commit | `203829403` |
| Merged at | 2026-09-03T09:35:07Z |
| Lint, test, build | SUCCESS |
| Code contract | SUCCESS |
| Playwright Preview smoke | SKIPPED (FLAG, rovnaký pattern ako #505) |

`apps/crm/vercel.json` na `main` má `GET /api/cron/customer-health` at `0 7 * * *`.

## SQL

Tabuľka **už existovala** (DDL som znova nespúšťal — `CREATE TABLE IF NOT EXISTS` by bolo no-op). Overené SELECT-om:

- stĺpce: `id, agency_id, checked_on, severity, is_paying, agency_name, signals, checked_at`
- unique `(agency_id, checked_on)`, FK `agencies(id) ON DELETE CASCADE`
- CHECK `severity IN ('orange','red')`
- indexy `idx_customer_health_daily_checked_on`, `idx_customer_health_daily_severity`
- RLS **on**, **žiadne** policies (fail-closed pre `anon`/`authenticated`)
- `count(*) = 0`

Chýbal záznam v histórii. Founder GO SQL → INSERT:

```
version = 20260903070000
name = customer_health_daily
```

`RETURNING` potvrdený. `list_migrations` pred INSERTom tento version nemal.

Default GRANT na `public` ostáva aj pre `anon`/`authenticated`; bez policy RLS vráti 0 riadkov. `service_role` má DML (cron persist).

## Nie overené v tomto behu

- Live `GET /api/cron/customer-health` s `CRON_SECRET` (secret v agente nie je).
- Smolko `red` v odpovedi.
- Že Vercel Production už zobral nový `vercel.json` (deploy po #507).
