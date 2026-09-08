# S1-B: Governance Audit

**Repository:** `RealitkaAI`
**Branch:** `docs/b19-s1-evidence-audit`
**Mode:** read-only static audit
**Production DB and cloud n8n access:** not performed

## Najprv som hľadal

Searched `automation/`, `scripts/`, `.ruflo/`, Supabase migration/config files, workflow files, service-role key usage, direct database clients, SQL outside migration directories, and branch refs. No branch, table, migration, or production resource was deleted or changed.

## DDL and privileged database access

| Surface | Evidence | Finding |
| --- | --- | --- |
| Supabase service role | `apps/crm/src/lib/supabase/admin.ts:8-16` | Creates a privileged Supabase client from `SUPABASE_SERVICE_ROLE_KEY`. |
| Realvia queue | `apps/crm/src/lib/realvia/webhookStore.ts:17-47`; `apps/crm/src/lib/realvia/processQueue.ts:17-20,171-188` | Uses privileged access for webhook persistence, queue processing, and property updates. |
| Schema guard | `apps/crm/scripts/schema-governance-guard.mjs:16-22` | Reads a dedicated service-role key for schema checks. |
| Direct production SQL | `apps/crm/scripts/apply-sandbox-gdpr-prod.mjs:5-15,31-52` | Connects through `POSTGRES_URL_NON_POOLING`, `POSTGRES_URL`, or `DATABASE_URL` and executes SQL directly. |
| SQL bundle | `apps/crm/scripts/build-prod-sql-bundle.mjs:5-27` | Builds a production SQL bundle from migrations. |
| Revenue migrations | `apps/revenue-intelligence/package.json:8-13` | Defines `npm run migrate` using `psql $DATABASE_URL`. |
| Broad grants | `apps/crm/supabase/migrations/20260613000002_service_role_table_grants.sql:3-15` | Grants broad table, sequence, and function privileges to `service_role`. |
| GitHub guard | `.github/workflows/schema-governance-guard.yml` | Manual-only schema guard; scheduled execution is disabled because required secrets are missing. |

No local file examined showed a direct `supabase db push` command. These are static paths, not proof that production execution occurred.

## Automation and n8n

| File | Static behavior | Cloud status |
| --- | --- | --- |
| `automation/n8n/w1-follow-up-strazca.json` | Creates Gmail drafts and sends a summary email. | Unknown locally. |
| `automation/n8n/w2-heartbeat-watchdog.json` | Polls two production URLs every 30 minutes and emails failures. | Unknown locally. |
| `automation/n8n/w3-odpoved-detektor.json` | Reads Gmail hourly and emails prospect-response notifications. | Unknown locally. |
| `automation/n8n/README.md:3-18` | Requires workflow exports to be versioned and credentials kept in n8n storage. | Documentation only. |
| `.ruflo/manifest-lead-form-public.yaml:1-13` | Declares production-risk reads/writes and required lead-form secrets; `migrations: false`. | Static manifest only. |

## Loose SQL outside migration directories

| File | Static classification |
| --- | --- |
| `apps/crm/supabase/01_create_leads.sql` | Schema/RLS DDL |
| `apps/crm/supabase/02_activities_properties.sql` | Schema/RLS DDL |
| `apps/crm/supabase/03_pipeline_moves.sql` | Schema DDL |
| `apps/crm/supabase/04_verify_current_schema.sql` | Verification SQL |
| `apps/crm/supabase/05_phase1_users_teams_properties.sql` | Schema DDL |
| `apps/crm/supabase/06_activity_stream_upgrade.sql` | Schema/view DDL |
| `apps/crm/supabase/06_phase1_schema.sql` | Schema DDL |
| `apps/crm/supabase/07_lead_property_matches.sql` | Schema DDL |
| `apps/crm/supabase/08_harden_properties_matching_recommendations.sql` | RLS/policy DDL |
| `apps/crm/supabase/09_rollback_08_harden_properties_matching_recommendations.sql` | RLS rollback DDL |
| `apps/crm/supabase/10_add_properties_optional_columns_and_matching_status.sql` | Schema DDL |
| `apps/crm/supabase/11_verify_properties_optional_columns_and_matching_status.sql` | Verification SQL |
| `apps/crm/supabase/12_rollback_10_add_properties_optional_columns_and_matching_status.sql` | Schema rollback DDL |
| `apps/crm/supabase/13_add_lead_assignment_rules.sql` | Schema DDL |
| `apps/crm/supabase/14_verify_lead_assignment_rules.sql` | Verification SQL |
| `apps/crm/supabase/15_add_model_version_to_matches.sql` | Schema DDL |
| `apps/crm/supabase/16_add_columns_to_ai_recommendations.sql` | Schema DDL |
| `apps/crm/supabase/17_add_integration_settings.sql` | Schema DDL |
| `apps/crm/supabase/18_add_tasks_and_saas_leads.sql` | Schema DDL |
| `apps/crm/supabase/19_fix_tasks_lead_id_nullable.sql` | Schema DDL |
| `apps/crm/supabase/20_buyer_intent.sql` | Schema DDL |
| `apps/crm/supabase/21_add_sofia_insight.sql` | Schema DDL |
| `apps/crm/supabase/22_realvia_webhook_infrastructure.sql` | Schema/queue DDL |
| `infra/sql/cleanup-test-leads.sql` | Destructive DELETE; manual-only warning in file |
| `apps/crm/scripts/guardian-v11-cleanup-invalid-stale.sql` | Cleanup SQL |
| `apps/crm/scripts/prod-sql-20260713-deploy.sql` | Production DDL bundle |
| `apps/crm/scripts/staging-ai-insight.sql` | Staging SQL |
| `apps/crm/scripts/staging-enable-rls-legacy.sql` | RLS DDL |

RLS/policy DDL is present in the listed loose SQL and in migration files including `20260320_rls.sql`, `20260425231407_event_pipeline.sql:103-153`, `20260425231426_bri_live_score.sql:35-60`, `20260507140000_rls_decision_tables.sql`, `20260507160000_rls_leads_activities.sql`, `20260508180000_rls_properties.sql`, `20260508210000_rls_tasks_recommendations.sql`, `20260508220000_rls_agencies_profiles_teams.sql`, and `20260508230000_rls_lead_property_matches.sql`.

## Branch inventory boundary

The local repository contains a large branch inventory under packed refs, including `ai-core-v2`, `chore/*`, `docs/*`, `feat/*`, `feature/*`, `fix/*`, `pr/*`, `security/*`, `swarm/*`, and `test/*`. The S1 branch itself is empty relative to `origin/main` at `97655763b254e4b5f9973ead58418e757dbc54f0`.

A complete merged/unmerged classification requires ancestry evaluation for every branch and is not inferred from branch names. This report does not delete or rewrite any branch. Remote branch state and cloud workflow activation were not queried beyond the repository's configured origin.

## Conclusion

The static governance risk is that privileged database paths, loose SQL, production SQL bundles, and automation exports coexist with a disabled/manual schema guard and no local proof of cloud activation state. The report is evidence for Founder review, not proof that any production DDL or n8n workflow actually ran.
