# SMO-B07 — scheduled_events preflight pack (N08)

**Dátum:** 2026-09-17  
**Uzol:** N08  
**Poznámka k vlnám:** ORCHESTRATOR W3 vyžaduje M1. M1 **nie je** hotové. Tento report je **prep-only** (docs), nie zelené svetlo na booking implementáciu.

**APPLY = Founder DB GO only (`GO-B07-DB`). Worker neaplikuje.**

## Migrácia

```text
PATH: apps/crm/supabase/migrations/20260527143000_event_scheduler_phase1.sql
```

Hash (spusti lokálne a doplň):

```powershell
Get-FileHash apps/crm/supabase/migrations/20260527143000_event_scheduler_phase1.sql -Algorithm SHA256
```

## Preflight (prod SQL Editor — read-only / potom apply len s GO)

```sql
select
  current_database() as database_name,
  to_regclass('public.scheduled_events') as existing_table,
  to_regprocedure('public.profile_agencies_for_auth()') as tenant_helper,
  to_regclass('public.agencies') as agencies_table,
  to_regclass('public.profiles') as profiles_table,
  to_regclass('public.leads') as leads_table,
  to_regclass('public.properties') as properties_table,
  exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260527143000'
  ) as migration_recorded;
```

## Postflight

```sql
select c.oid::regclass as table_name, c.relrowsecurity as rls_enabled
from pg_class c
where c.oid = to_regclass('public.scheduled_events');

select policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename = 'scheduled_events';

select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'scheduled_events'
order by indexname;
```

## Drift (register)

Historicky: tabuľka ABSENT + `migration_recorded` môže tvrdiť opak. Po apply zosúladiť Dashboard run s `schema_migrations` schváleným postupom — **nevkladať ručný riadok**.

## Fallback

Callback handoff bez bookingu (M1 path).

## HANDOFF

```text
NODE: N08
RESULT: HUMAN (apply = ops)
GO-B07-DB: GRANTED 2026-09-17 (founder chat)
WORKER_APPLY: FORBIDDEN (permanent ban — founder/ops applies migration)
MIGRATION: apps/crm/supabase/migrations/20260527143000_event_scheduler_phase1.sql
SHA256: FCA3C473FDBD02A64D6FA0E1E36D950E674DA1025FE0A4BB33F87C17E2F9613E
N09/N10_CODE: shipped on branch (freebusy + booking idempotency helpers)
PROD_READY: pending ops apply + GO-B08-OAUTH token in env
REPORT: docs/reports/2026-09-17-smo-b07-preflight.md
```
