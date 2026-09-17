# SMO-B04 — PROD evidence pack (N04)

**Dátum:** 2026-09-17  
**Uzol:** N04  
**Environment (target):** `ypgajkhqtbriqqmyawyv` (register)  
**Worker prod SQL access this session:** **none** → `RESULT: HUMAN`

---

## CODE evidence (commands run)

```text
$ git merge-base --is-ancestor 61b8e3938e2936ba6b5977035bac4e96399963e7 origin/main
exit=0   # #569 on main

$ git merge-base --is-ancestor aaf2230e43e666153b9c07272c2e1eb67832173d origin/main
exit=0   # #573 on main

$ git cat-file -e origin/main:apps/crm/src/lib/properties/public-visibility.ts
exit=0
```

| kritérium | CODE | PROD |
|---|---|---|
| lookup/update viazaný na `agency_id` | PASS (#569) | **unknown** |
| negatívny cross-tenant test | PASS (unit #569) | **unknown** |
| active/freshness kontrakt | PASS (#573 `public-visibility.ts`) | **unknown** |

**B04 register status:** zostáva `BLOCKED` (CODE_PRESENT ≠ PROD_READY).

---

## PROD SQL checklist — GO-B04-PROD (read-only)

Spustiť v [SQL Editor](https://supabase.com/dashboard/project/ypgajkhqtbriqqmyawyv/sql/new) a vložiť výstup sem s časom UTC.

### 1) Stĺpec `realvia_updated_at`

```sql
select count(*) as has_col
from information_schema.columns
where table_schema = 'public'
  and table_name = 'properties'
  and column_name = 'realvia_updated_at';
```

### 2) Freshness rozdelenie

```sql
select
  count(*) filter (where realvia_updated_at is null) as null_ts,
  count(*) filter (where realvia_updated_at >= now() - interval '7 days') as fresh_7d,
  count(*) filter (where realvia_updated_at <  now() - interval '7 days') as stale_7d,
  count(*) as total
from public.properties;
```

### 3) Cross-tenant

Negatívny dôkaz podľa registra (tenant A nečíta tenant B). **Žiadny zápis.**

---

## HANDOFF

```text
NODE: N04
RESULT: HUMAN
B04_PROD: unknown
COL_realvia_updated_at: unknown
FRESHNESS_SUMMARY: unknown (no prod SQL this session)
CROSS_TENANT: unknown
GO_REQUIRED: GO-B04-PROD
REPORT: docs/reports/2026-09-17-smo-b04-prod-evidence.md
```
