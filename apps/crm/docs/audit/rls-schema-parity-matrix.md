# RLS + Schema-Parity Matrix

Generated: 2026-06-26T06:51:26.123Z · READ-ONLY audit

## Summary
- PROD tables: **96** · Allowlist: **96**
- P0: **42** · P1: **7** · P2: **66**
- Unscoped API write hits (P0 class): **9**

## PR Backlog (severity order)

- `fix/resolveTenantSupabase-audit` · **P0** · open — Unscoped store writers: activities-store.ts, sales-funnel-store.ts
- `fix/rls-policy-activities` · **P0** · open — replace using(true) with profile_agencies_for_auth
- `fix/rls-policy-ai_sourced_deals` · **P0** · open — replace using(true) with profile_agencies_for_auth
- `fix/rls-enable-client_onboarding_messages` · **P0** · open — enable RLS + tenant policy
- `fix/rls-enable-client_onboarding_progress` · **P0** · open — enable RLS + tenant policy
- `fix/rls-policy-push_subscriptions` · **P0** · open — replace using(true) with profile_agencies_for_auth
- `fix/ci-ap019-guard` · **P1** · open — schema-governance-guard: CREATE TABLE requires allowlist+policy+verification in same PR

## P0 rows

| table | gaps | notes |
|---|---|---|
| activities | permissive_policy, missing_tenant_policy_repo | permissive using(true) without profile_agencies_for_auth scope |
| agencies | — | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| ai_sourced_deals | permissive_policy, missing_tenant_policy_repo | permissive using(true) without profile_agencies_for_auth scope |
| ai_triage_feedback | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| ai_triage_run_metrics | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| bri_history | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| buyer_events | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| buyer_intents | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| client_onboarding_messages | rls_off_tenant | RLS off on tenant-scoped table (cross-tenant leak at customer #2) |
| client_onboarding_progress | rls_off_tenant | RLS off on tenant-scoped table (cross-tenant leak at customer #2) |
| competition_radar | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| dashboard_insights_cache | — | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| decisions | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| enrichment_log | — | RLS off on tenant-scoped table (cross-tenant leak at customer #2) |
| exclusivity_outcomes | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| ghost_sessions | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| ghostwriter_letters | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| import_jobs | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| import_rows | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| integration_settings | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| lead_action_scores | — | RLS off on tenant-scoped table (cross-tenant leak at customer #2) |
| lead_closing_windows | — | RLS off on tenant-scoped table (cross-tenant leak at customer #2) |
| lead_micro_actions | — | RLS off on tenant-scoped table (cross-tenant leak at customer #2) |
| lead_property_events | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| lead_property_scores | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| lead_rescue_runs | — | RLS off on tenant-scoped table (cross-tenant leak at customer #2) |
| neighborhood_alerts | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| neighborhood_subscriptions | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| onboarding_sessions | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| pipeline_moves | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| platform_events | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| priority_alerts | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| profile_google_calendar | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| profiles | — | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| push_subscriptions | permissive_policy, missing_tenant_policy_repo | permissive using(true) without profile_agencies_for_auth scope |
| realvia_price_history | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| realvia_webhook_logs | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| routine_notifications | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| scheduled_events | — | RLS off on tenant-scoped table (cross-tenant leak at customer #2) |
| shadow_inventory | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| team_licenses | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |
| usage_metrics_daily | missing_tenant_policy_repo | RLS on but repo migrations missing SELECT/INSERT policy coverage |

## Limitations
- Live `pg_policies` not queried (POSTGRES_URL empty). Policy columns are **repo migration parse**.
- Re-run with DB URL for live policy parity confirmation.
