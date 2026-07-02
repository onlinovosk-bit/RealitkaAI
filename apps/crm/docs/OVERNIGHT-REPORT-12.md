# OVERNIGHT REPORT 12 — Don't-Die Hardening (Wave A)

## Objective
- Prevent cross-tenant leakage before additional external data inflow (RealSoft / admin imports).
- Convert RLS posture from “best effort” to centrally audited and regression-tested.

## Runtime evidence captured
- TEST RPC snapshot (`rls_audit_snapshot`):
  - `80` public tables
  - `29` tables include `agency_id`
  - `0` of those had RLS disabled
- Isolation run found active cross-tenant leaks in:
  - `leads`
  - `properties`
  - `outreach_logs`

## Remediation shipped in branch
- Migration `20260616123000_rls_wave_a_hardening.sql`
  - strict tenant policy pass over agency-scoped decision tables
  - service-role-only policy guardrails for:
    - `agency_signals`
    - `listings_snapshot`
    - `outbound_messages`
    - `migration_cases`
- Migration `20260616124500_rls_wave_a_leak_closure.sql`
  - drops permissive/demo policies on `leads` and `properties`
  - recreates strict tenant policy via `profile_agencies_for_auth()`
  - hardens `outreach_logs` so null-profile/null-lead rows cannot bypass tenant checks

## Registry and test hardening
- Central tenant registry expanded to include previously uncovered agency tables:
  - `enrichment_log`
  - `agency_signals` (service-role-only)
  - `listings_snapshot` (service-role-only)
  - `outbound_messages` (service-role-only)
  - `migration_cases` (service-role-only)
- Fixture updates:
  - added `enrichment_log` A/B seeds
  - rerun-safe onConflict for unique-key tables in RLS fixture pipeline
- Isolation helper update:
  - explicit TEST override mode for RLS suite when local Docker Supabase is unavailable

## Status
- Full Wave A suite rerun is in progress after latest seed idempotency fixes.
- Final fail/pass matrix and remaining holes will be locked after this run.

