-- Replace open "demo" RLS policies on agencies, profiles, teams
-- with proper tenant-scoped policies
-- Use IN (SELECT ...) — consistent with existing migrations; ANY() not allowed in RLS.

-- ─── agencies ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "demo_select_agencies" ON public.agencies;
DROP POLICY IF EXISTS "demo_insert_agencies" ON public.agencies;
DROP POLICY IF EXISTS "demo_update_agencies" ON public.agencies;

CREATE POLICY "agencies_member_select"
  ON public.agencies FOR SELECT
  USING (id IN (SELECT profile_agencies_for_auth()));

CREATE POLICY "agencies_member_update"
  ON public.agencies FOR UPDATE
  USING (id IN (SELECT profile_agencies_for_auth()))
  WITH CHECK (id IN (SELECT profile_agencies_for_auth()));

-- ─── profiles ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "demo_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "demo_insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "demo_update_profiles" ON public.profiles;

CREATE POLICY "profiles_agency_select"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR agency_id IN (SELECT profile_agencies_for_auth())
  );

CREATE POLICY "profiles_self_update"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─── teams ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "demo_select_teams" ON public.teams;
DROP POLICY IF EXISTS "demo_insert_teams" ON public.teams;
DROP POLICY IF EXISTS "demo_update_teams" ON public.teams;
DROP POLICY IF EXISTS "demo_delete_teams" ON public.teams;

CREATE POLICY "teams_agency"
  ON public.teams FOR ALL
  USING (agency_id IN (SELECT profile_agencies_for_auth()))
  WITH CHECK (agency_id IN (SELECT profile_agencies_for_auth()));
