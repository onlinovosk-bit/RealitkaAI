# Critical: profiles role/agency self-escalation

**Date:** 2026-08-30  
**Severity:** CRITICAL (privilege escalation / authz bypass)  
**Status:** Fixed on branch (PR pending)

## Bug and impact

`profiles_self_update` RLS allows any authenticated user to `UPDATE` their own `profiles` row (`id = auth.uid()`) with **no column restriction**. There was a guard only for `is_platform_admin`, not for `role` / `agency_id`.

**Concrete trigger**

1. Broker invited with `role = 'agent'` and `profiles.id = auth.users.id`.
2. From the browser Supabase client (or any authenticated PostgREST call):
   `UPDATE profiles SET role = 'owner' WHERE id = auth.uid()`.
3. RLS allows the write → user becomes owner.
4. Impact: `/settings` access, team invites, password-recovery tooling for others, team-wide visibility — full tenant privilege escalation. Same path can reassign `agency_id` (cross-tenant move).

Secondary: `POST /api/onboarding/role` used `createAdminClient()` to upsert `role` for **any** authenticated caller (owner→manager mapping). Current onboarding UI does not call it, but the route remained an admin escalation endpoint.

## Root cause

- Wave that replaced open demo RLS left `profiles_self_update` as full-row UPDATE.
- Platform-admin trigger was added later; role/agency were never frozen for JWT clients.
- Onboarding role route bypassed RLS via service role without an owner check.

## Fix

1. Migration `20260830231500_profiles_guard_role_agency.sql` — BEFORE UPDATE trigger soft-reverts `role` / `agency_id` unless JWT role is `service_role` (same pattern as `profiles_guard_platform_admin`).
2. `POST /api/onboarding/role` — fail-closed 403; no admin upsert.
3. `PATCH /api/profiles/[id]` — fail-closed tenant gate; role/isActive only for owner/founder via admin client; refuse self role change.

Invite / billing / other service_role writers remain able to set role.

## Validation

- Unit: `src/app/api/onboarding/role/__tests__/route.test.ts`
- Unit: `src/app/api/profiles/[id]/__tests__/route.test.ts`
- Verification: `tests/verification/profiles-role-agency-guard.verification.test.ts`

## Remaining risk

- DB trigger applies after migration is deployed to each environment (preview/prod).
- `ui_role` / `account_tier` are intentionally not frozen (entitlement sync + billing); `canManageUsers` also keys off some `ui_role` values for paid tiers by design.
- Open backlog of prior critical PRs still awaiting review (#369–#492 series).
