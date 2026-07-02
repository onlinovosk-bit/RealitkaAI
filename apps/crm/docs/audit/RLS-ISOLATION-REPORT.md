# RLS Tenant Isolation Report

Generated: 2026-06-16 · Branch: `chore/rls-tenant-isolation-suite`

## Summary

| Metric | Value |
|--------|-------|
| Tenant tables in registry | 62 |
| Tables tested (CRUD probe) | 58 |
| RLS disabled findings | 0 |
| Critical isolation failures | 0 |
| Vitest assertions | 0 |

## Tenant tables

| Table | RLS enabled | Isolation | Fix |
|-------|-------------|-----------|-----|
| `agencies` | yes | OK | — |
| `teams` | yes | OK | — |
| `profiles` | yes | OK | — |
| `leads` | yes | OK | — |
| `properties` | yes | OK | — |
| `activities` | yes | OK | — |
| `tasks` | yes | OK | — |
| `ai_recommendations` | yes | OK | — |
| `lead_property_matches` | yes | OK | — |
| `lead_events` | yes | OK | — |
| `lead_scores` | yes | OK | — |
| `client_dna` | yes | OK | — |
| `deal_risk` | yes | OK | — |
| `deal_moments` | yes | OK | — |
| `ai_actions` | yes | OK | — |
| `lead_action_scores` | yes | OK | — |
| `lead_closing_windows` | yes | OK | — |
| `lead_rescue_runs` | yes | OK | — |
| `lead_micro_actions` | yes | OK | — |
| `ai_action_audit` | yes | OK | — |
| `ai_sourced_deals` | yes | OK | — |
| `scheduled_events` | yes | OK | — |
| `routine_notifications` | yes | OK | — |
| `credit_ledger` | yes | OK | — |
| `dashboard_insights_cache` | yes | OK | — |
| `import_jobs` | yes | OK | — |
| `import_rows` | yes | OK | — |
| `realsoft_import_logs` | yes | OK | — |
| `enrichment_log` | yes | OK | — |
| `agency_signals` | yes | N/A (service_role) | — |
| `listings_snapshot` | yes | N/A (service_role) | — |
| `outbound_messages` | yes | N/A (service_role) | — |
| `migration_cases` | yes | N/A (service_role) | — |
| `stealth_recruiter_prospects` | yes | OK | — |
| `demand_signals` | yes | OK | — |
| `competitor_monitoring` | yes | OK | — |
| `competitor_activity_logs` | yes | OK | — |
| `strategic_alerts` | yes | OK | — |
| `morning_brief_settings` | yes | OK | — |
| `morning_briefs` | yes | OK | — |
| `profile_integrations` | yes | OK | — |
| `profile_google_calendar` | yes | OK | — |
| `outreach_campaigns` | yes | OK | — |
| `outreach_segments` | yes | OK | — |
| `outreach_templates` | yes | OK | — |
| `events` | yes | OK | — |
| `integrity_alerts` | yes | OK | — |
| `bri_score_history` | yes | OK | — |
| `bri_config` | yes | OK | — |
| `lead_conversions` | yes | OK | — |
| `broker_performance_stats` | yes | OK | — |
| `notifications` | yes | OK | — |
| `push_subscriptions` | yes | OK | — |
| `watched_parcels` | yes | OK | — |
| `property_price_trail` | yes | OK | — |
| `seller_motivation` | yes | OK | — |
| `price_alerts` | yes | OK | — |
| `outreach_logs` | yes | OK | — |
| `arbitrage_config` | yes | OK | — |
| `arbitrage_matches` | yes | OK | — |
| `broker_profiles` | yes | OK | — |
| `broker_events` | yes | OK | — |

## Platform tables (not cross-tenant)

| Table | Note |
|-------|------|
| `demo_prospects` | B2B demo ops — no agency_id; service_role crons |
| `demo_bookings` | Calendly pipeline — no agency_id; service_role crons |
| `rate_limit_buckets` | System rate limiting |
| `developer_api_key_requests` | Public insert onboarding form |
| `api_keys` | B2B API — service_role only |
| `api_usage_logs` | B2B API — service_role only |
| `bsm_campaign_config` | Global campaign config |
| `bsm_reforma_leads` | Public lead capture |
| `portal_listings` | Shared portal inventory |
| `listing_price_history` | Portal-linked history |
| `kataster_events` | Scoped via watched_parcels (tested indirectly) |
| `realvia_metrics` | Cron batch metrics — service_role only; no agency_id |

## Method

- Seed: 2 agencies (A/B), owner + broker users, rows in tenant tables via service role.
- Probe: Agency A owner authenticated client (anon key, not service role).
- Expect: SELECT/INSERT/UPDATE/DELETE on agency B data blocked.
- RLS status: `rls_audit_snapshot()` RPC (service_role).
