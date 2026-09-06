# L1 — Public register must not join Reality Smolko tenant

**Date:** 2026-09-03  
**Branch:** `fix/register-creates-own-agency`  
**Mode:** branch + PR + STOP

## Nález

`register/actions.ts` assigned every new signup to
`agency_id = 11111111-1111-1111-1111-111111111111` (production **Reality Smolko**)
and `team_id = 22222222-…`. Global profile count made `role` always `"agent"`.

## Čo je v tomto PR

1. Removed `DEFAULT_AGENCY_ID` / `DEFAULT_TEAM_ID` insert path.
2. Removed global `count → owner/agent` logic.
3. Email-link path no longer overwrites `role`/`agency_id`.
4. **Fail closed** for brand-new profiles: clear error instead of Smolko assignment.
5. Source tests assert Smolko UUID never appears in `.insert({…})`.

## Čo NIE JE postavené (zakladanie tenantu — GO REQUIRED)

Repo evidence:

- RLS on `agencies`: SELECT + UPDATE for members only — **no INSERT** for `authenticated`
  (`20260508220000_rls_agencies_profiles_teams.sql`).
- No registration-time agency bootstrap elsewhere; only service-role/admin in tests /
  portal discovery (`SupabaseAgenciesRepository`).

**Proposed follow-up (founder GO):** after `signUp`, use `createServiceRoleClient()` to:

1. INSERT `agencies` (name from fullName/email, unique slug)
2. optionally INSERT default `teams` row
3. INSERT `profiles` with that `agency_id`, `role: "owner"`, `auth_user_id`
4. never touch Smolko UUID

Until GO: public self-serve signup refuses new tenant creation (door closed).

## Nedotknuté

Welcome email send + redirect to onboarding (unchanged for email-link success path).
