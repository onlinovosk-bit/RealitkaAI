# Customer-health Vercel cron

**Branch:** `feat/customer-health-watchdog`  
**Follow-up to:** [#505](https://github.com/onlinovosk-bit/RealitkaAI/pull/505) (`86a6ba3c` on `main`)

## Zmena

`apps/crm/vercel.json` — cron `GET /api/cron/customer-health` at `0 7 * * *` (07:00 UTC, same slot as heartbeat).

## Ešte nie live

Tabuľka `customer_health_daily` sa z CI neaplikuje. Founder: Dashboard SQL `apps/crm/supabase/migrations/20260903070000_customer_health_daily.sql`, potom:

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
VALUES ('20260903070000', 'customer_health_daily', ARRAY[]::text[], NULL);
```

Smoke after merge + SQL: `Authorization: Bearer $CRON_SECRET` → Smolko `red`.
