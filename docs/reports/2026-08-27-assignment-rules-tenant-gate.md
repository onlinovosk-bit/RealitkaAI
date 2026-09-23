# Critical bug: lead_assignment_rules cross-tenant wipe

**Date:** 2026-08-27  
**Severity:** CRITICAL (security / data loss)  
**PR:** (opened by automation)

## Bug and impact

`/api/automation/rules` listed and mutated **all** assignment rules across tenants. Any authenticated user (or the cookie-less anon singleton used by the store) could **DELETE another tenant's rules**. Settings → Automatizácia showed a global shared pool.

Concrete trigger (reproduced locally against open demo RLS + grants):

1. Seed two rules (TenantA / TenantB) with open `USING (true)` policies.
2. `GET` via anon key returns both rows.
3. Ownership check `select("agency_id")` → Postgres `42703` column does not exist → route treated missing row as `ok: true` ("demo mode").
4. `DELETE` via anon key returns HTTP 200 and removes TenantB's rule.

## Root cause

1. Table created via `supabase/13_add_lead_assignment_rules.sql` with **open demo RLS** (`USING (true)`), no `agency_id`, on prod (`on_prod: true` in RLS parity matrix).
2. `lead-automation-store` used a **cookie-less anon** Supabase singleton (`persistSession: false`) — bypasses user JWT / tenant context.
3. `[id]/route` `resolveOwnership` selected non-existent `agency_id` and **fail-opened** when the rule row was missing/errored.

## Fix

- Migration `20260827230000_lead_assignment_rules_tenant_rls.sql`: add `agency_id`, replace demo policies with `profile_agencies_for_auth()`, revoke anon.
- Store: `resolveTenantSupabase(scoped)` + require/filter/stamp `agencyId` on list/create/update/delete.
- API: fail-closed without caller `agency_id`; ownership 404/403 (no demo ok).
- Tests: route unit + verification suite.

## Validation

- Vitest: automation rules route tests + verification file.
- Local PostgREST probe documented above (pre-fix wipe → post-migration anon denied).

## Residual risk

- Existing prod rows with `agency_id IS NULL` become invisible under tenant RLS until ops backfill. Safer than leaving open wipe path.
- `autoAssignLeads` still uses `listLeads` without agency filter in least-loaded helper — out of this PR scope (feature barely wired).
