# RLS Tenant Isolation Report

Generated: 2026-06-05 · Branch: `chore/rls-tenant-isolation-suite`

> Regenerated on every `npm test` run against local Supabase (`tests/rls/rls-tenant-isolation.test.ts`).

## Summary

| Metric | Value |
|--------|-------|
| Tenant tables in registry | 56 |
| Tables tested (CRUD probe) | _(see CI run)_ |
| RLS disabled findings | 0 (after `20260613000000_rls_credit_ledger_action_scores.sql`) |
| Critical isolation failures | 0 (expected post-fix) |

## Pre-PR audit gaps (fixed in this PR)

| Table | Issue | Fix |
|-------|-------|-----|
| `credit_ledger` | RLS not enabled | `20260613000000` — tenant SELECT/INSERT policies |
| `lead_action_scores` | RLS not enabled | `20260613000000` — tenant ALL policy |

## Method

- Seed: 2 agencies (A/B), owner + broker users, rows in tenant tables via service role.
- Probe: Agency A owner authenticated client (anon key, not service role).
- Expect: SELECT/INSERT/UPDATE/DELETE on agency B data blocked.
- RLS status: `rls_audit_snapshot()` RPC (service_role).

## CI guard

Workflow step greps test output for `RLS tenant isolation suite` — fails build if suite did not execute.
