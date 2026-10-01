# OVERNIGHT MASTER BRIEF 12 — Don't-Die Hardening
**Dátum:** 2026-06-16 · **Status:** in-progress (Wave A running)

## Wave A scope (RLS audit)
- Enumerate all `public` tables with `agency_id` and verify RLS posture.
- Ensure central tenant registry includes every tenant-scoped table (or explicitly marks service-role-only tables).
- Remove known policy anti-patterns:
  - permissive `agency_id IS NULL OR ...`
  - inherited/open demo policies on tenant data
  - overlapping tenant policies that widen access unintentionally

## Current findings from TEST run
- `rls_audit_snapshot()` on TEST reports:
  - total public tables: `80`
  - tables with `agency_id`: `29`
  - tables with `agency_id` and RLS disabled: `0`
- Initial isolation sweep detected confirmed cross-tenant leaks on:
  - `leads`
  - `properties`
  - `outreach_logs`
- Registry coverage gaps found for agency-scoped tables:
  - `agency_signals`
  - `listings_snapshot`
  - `outbound_messages`
  - `enrichment_log`
  - `migration_cases` (service-role-only)

## Wave A fixes applied (this branch)
- Added missing tenant tables to central registry (`tests/rls/tenant-table-registry.ts`), with service-role-only markers where appropriate.
- Added missing fixture seeding for `enrichment_log`.
- Added strict RLS hardening migration:
  - `20260616123000_rls_wave_a_hardening.sql`
  - removes NULL-branch tenant bypasses on key agency tables
  - adds explicit service-role-only policies for automation tables with `agency_id`
- Added leak-closure migration:
  - `20260616124500_rls_wave_a_leak_closure.sql`
  - hardens `leads`, `properties`, and `outreach_logs`
  - drops legacy permissive/demo policies on those tables

## Test execution state
- Full `tests/rls/rls-tenant-isolation.test.ts` against TEST project is running with remote-test override.
- Seed idempotency hardening has been added for reruns (`lead_property_matches`, `stealth_recruiter_prospects`, and other unique-key tables).

## Open
- Final red/green result of the full Wave A suite after latest seed hardening run.
- Final “RLS holes list” will be frozen from that run output and attached in report.

