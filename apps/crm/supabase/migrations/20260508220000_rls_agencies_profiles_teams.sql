-- Replace open "demo" RLS policies on agencies, profiles, teams
-- with proper tenant-scoped policies

-- ─── agencies ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "demo_select_agencies" ON public.agencies;
DROP POLICY IF EXISTS "demo_insert_agencies" ON public.agencies;
DROP POLICY IF EXISTS "demo_update_agencies" ON public.agencies;

-- Users can only see agencies they belong to
CREATE POLICY "agencies_member_select"
  ON public.agencies FOR SELECT
  USING (id = ANY(profile_agencies_for_auth()));

-- Only service role / cron inserts agencies (no user-facing insert)
-- (INSERT remains restricted — no policy = deny)

-- Agencies can only be updated by their own members
CREATE POLICY "agencies_member_update"
  ON public.agencies FOR UPDATE
  USING (id = ANY(profile_agencies_for_auth()))
  WITH CHECK (id = ANY(profile_agencies_for_auth()));

-- ─── profiles ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "demo_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "demo_insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "demo_update_profiles" ON public.profiles;

-- Users can see their own profile and profiles in their agency
CREATE POLICY "profiles_agency_select"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR agency_id = ANY(profile_agencies_for_auth())
  );

-- Profiles are created by service role (no direct user INSERT)
-- Service role bypass means no policy needed for server-side profile creation

-- Users can only update their own profile
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
  USING (agency_id = ANY(profile_agencies_for_auth()))
  WITH CHECK (agency_id = ANY(profile_agencies_for_auth()));
