# Production Schema Governance Checklist

Use this checklist when unexpected tables appear in production schema.

## 1) Identify suspicious tables

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name ILIKE '%AI AGENT AUTOMAT ONBOARDING%'
    OR table_name ILIKE '%gpmmfashion%'
  )
ORDER BY table_name;
```

## 2) Verify table contents before cleanup

```sql
SELECT COUNT(*) AS row_count FROM public."AI AGENT AUTOMAT ONBOARDING";
SELECT COUNT(*) AS row_count FROM public."AI AGENT AUTOMAT ONBOARDING no.2.01";
SELECT COUNT(*) AS row_count FROM public."gpmmfashion@gmail.com tabulka";
```

## 3) Drop only empty junk tables

```sql
DROP TABLE IF EXISTS public."AI AGENT AUTOMAT ONBOARDING";
DROP TABLE IF EXISTS public."AI AGENT AUTOMAT ONBOARDING no.2.01";
DROP TABLE IF EXISTS public."gpmmfashion@gmail.com tabulka";
```

## 4) Audit writer identity (governance)

```sql
SELECT usename, query, query_start
FROM pg_stat_activity
WHERE query ILIKE '%AI AGENT AUTOMAT ONBOARDING%'
   OR query ILIKE '%gpmmfashion%'
ORDER BY query_start DESC;
```

## 5) Prevent recurrence

- Keep service-role keys server-only.
- Block ad-hoc schema writes from agent/test sandboxes.
- Add explicit schema allowlist checks in migration pipeline.
