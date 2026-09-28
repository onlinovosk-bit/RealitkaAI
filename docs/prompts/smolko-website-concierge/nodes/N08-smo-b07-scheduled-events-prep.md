# N08 — SMO-B07 scheduled_events PREP (bez apply)

## S2 TASK

Priprav **preflight + postflight balík** pre produkčnú migráciu `scheduled_events`.
Migrácia v repe už existuje (`20260527143000_event_scheduler_phase1.sql`).
**Neaplikuj ju.** Zdokumentuj drift (tabuľka ABSENT vs history) a checklist GO-B07-DB.

## S3 TERRITORY

**Write:** `docs/reports/YYYY-MM-DD-smo-b07-preflight.md` (NOVÝ)  
**Read:** migrácia, implementation guide, register §B07  
**Forbidden:** spustenie SQL na prod, edit migračného súboru „pre istotu“, INSERT do `schema_migrations`

## S4 ACCEPTANCE

- Preflight SQL (z registra) skopírovaný + miesto na vloženie výstupu
- Postflight SQL + RLS negative checklist
- Checksum/path migrácie (`sha256sum` alebo `Get-FileHash`)
- Explicit: „APPLY = Founder DB GO only“
- Rollback/fallback: callback without booking

## S5 VALIDATION

```bash
test -f apps/crm/supabase/migrations/20260527143000_event_scheduler_phase1.sql
Get-FileHash apps/crm/supabase/migrations/20260527143000_event_scheduler_phase1.sql -Algorithm SHA256
rg -n "scheduled_events|SMO-B07" docs/briefs/reality-smolko-blocking-conditions-register.md
```

## S6 FAILURE

- Tlak na apply → odmietni (S0 produkcia)
- History drift nejasný → HUMAN + RCA požiadavka (už v ingest reporte)

## S7 HANDOFF

```text
NODE: N08
RESULT: HUMAN
GO_REQUIRED: GO-B07-DB
MIGRATION: apps/crm/supabase/migrations/20260527143000_event_scheduler_phase1.sql
SHA256: ...
REPORT: ...
BLOCKS: N09/N10 until table PROD_READY
```
