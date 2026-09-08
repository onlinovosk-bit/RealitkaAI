# S1-A: Migration Drift Audit

**Repository:** `RealitkaAI`
**Branch:** `docs/b19-s1-evidence-audit`
**Mode:** read-only static audit
**Production access:** not performed

## Evidence boundary

The repository contains migration files and application references, but it does not contain a trustworthy production migration-history export. Local CI uses an ephemeral Supabase database (`.github/workflows/saas-grade-pipeline.yml`) and cannot prove production application state. Comments in migration files are repository claims, not production evidence.

All verdicts below are therefore **PREDBEŽNÉ — čaká na prod zoznam**.

Founder should run in the production database:

```sql
select version from supabase_migrations.schema_migrations order by version;
```

The returned versions must be compared to the repository migration filenames. No production result was invented in this report.

## Five highest-risk static candidates

| Migrácia / objekt | Čo pridáva | Používa to kód? | Dôkaz súbor:riadok | Predbežný verdikt |
| --- | --- | --- | --- | --- |
| `20260425231426_bri_live_score.sql` | BRI RPC and score/config/history tables | Áno | `apps/crm/src/lib/bri/engine.ts:25-34,68-96` calls `compute_bri_score_v2` and reads `lead_scores`, `bri_score_history`, `bri_config` | PREDBEŽNÉ — čaká na prod zoznam; `NEJASNÉ` |
| `20260425231407_event_pipeline.sql` | Event tables, `log_event`, related RLS | Áno | `apps/crm/src/app/api/events/route.ts:30-61` writes events and triggers BRI/integrity effects | PREDBEŽNÉ — čaká na prod zoznam; `NEJASNÉ` |
| Realvia webhook infrastructure migration family | `realvia_webhook_logs`, `realvia_processing_queue` | Áno | `apps/crm/src/lib/realvia/webhookStore.ts:31-47,76-89,184-210` | PREDBEŽNÉ — čaká na prod zoznam; `TICHÉ ZLYHANIE` candidate |
| `20260811220000_acquisition_core.sql` and `20260815234500_acquisition_sync_tables.sql` | Acquisition accounts, campaigns, events | Áno | `apps/crm/src/lib/acquisition/load-dashboard.ts:165-190` | PREDBEŽNÉ — čaká na prod zoznam; `NEJASNÉ` |
| `202605*` lead/property/RLS migration family | Lead, agency, rate-limit, and matching schema used by public lead form | Áno | `.ruflo/manifest-lead-form-public.yaml:1-13`; `apps/crm/src/app/f/[slug]/page.tsx`; `apps/crm/src/app/api/leads/inbound/route.ts` | PREDBEŽNÉ — čaká na prod zoznam; `NEJASNÉ` |

## Known repository references

- `20260816230000_prod_drift_profiles_leads.sql:1-8` says production changes were manually applied and should not be applied through `supabase db push`.
- `20260904150000_drop_open_anon_policies.sql:1-8` claims production application on 2026-09-04.
- `20260904220000_drop_onboarding_sessions_anon_all.sql:1-10` is explicitly prepared-only.
- The repository contains additional migration trees under `apps/realvia-ingestion/migrations/`, `apps/revenue-intelligence/migrations/`, and `apps/crm/supabase/migrations-archive/`.

These statements are not substitutes for the production query above.

## Static scope

The primary CRM migration tree contains timestamped files from `20260310_baseline_core_schema.sql` through September 2026, including duplicate-looking historical names such as `20260527143000_event_scheduler_phase1.sql`. A complete applied/unapplied classification is intentionally not asserted until the production version list is supplied.

## Conclusion

The strongest static finding is dependency risk: application code directly calls RPCs, selects migration-created tables, and writes queue/event records whose production presence cannot be established from this checkout. The next evidence step is the production `schema_migrations` query, not `supabase db push` and not a migration application.
