-- 20260904150000_drop_open_anon_policies.sql
-- PREPARED ONLY — DO NOT APPLY without founder review.
-- Audit: docs/audit/2026-09-04-rls-anon-policies.md
-- Rollback: docs/runbooks/rollback-anon-policies.md
-- Idempotent: DROP POLICY IF EXISTS / CREATE only after drop of replaced demos.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. integration_settings — ZRUŠIŤ (audit #1–4)
--    Open demo policies expose imap_password to anon. No app code references.
-- ═══════════════════════════════════════════════════════════════════════════

-- Audit #1 ZRUŠIŤ — demo_select_integration_settings
DROP POLICY IF EXISTS "demo_select_integration_settings" ON public.integration_settings;

-- Audit #2 ZRUŠIŤ — demo_insert_integration_settings
DROP POLICY IF EXISTS "demo_insert_integration_settings" ON public.integration_settings;

-- Audit #3 ZRUŠIŤ — demo_update_integration_settings
DROP POLICY IF EXISTS "demo_update_integration_settings" ON public.integration_settings;

-- Audit #4 ZRUŠIŤ — demo_delete_integration_settings
DROP POLICY IF EXISTS "demo_delete_integration_settings" ON public.integration_settings;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. activities — ZRUŠIŤ (audit #5–6)
--    Tenant policies for authenticated already exist (activities_tenant_*).
-- ═══════════════════════════════════════════════════════════════════════════

-- Audit #5 ZRUŠIŤ — activities_anon_legacy_all (ALL incl. DELETE)
DROP POLICY IF EXISTS "activities_anon_legacy_all" ON public.activities;

-- Audit #6 ZRUŠIŤ — activities_anon_insert (demo lead capture; inbound uses service role)
DROP POLICY IF EXISTS "activities_anon_insert" ON public.activities;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. properties — ZRUŠIŤ (audit #7)
--    No repo origin; authenticated insert policies already exist.
-- ═══════════════════════════════════════════════════════════════════════════

-- Audit #7 ZRUŠIŤ — properties_anon_insert
DROP POLICY IF EXISTS "properties_anon_insert" ON public.properties;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. lead_property_matches — ZRUŠIŤ (audit #9)
-- ═══════════════════════════════════════════════════════════════════════════

-- Audit #9 ZRUŠIŤ — matches_anon_legacy_all
DROP POLICY IF EXISTS "matches_anon_legacy_all" ON public.lead_property_matches;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. pipeline_moves — NAHRADIŤ (audit #10–11)
--    Pattern: activities_tenant_select / activities_tenant_write via lead → agency.
-- ═══════════════════════════════════════════════════════════════════════════

-- Audit #10 NAHRADIŤ — drop open demo select
DROP POLICY IF EXISTS "demo_select_pipeline_moves" ON public.pipeline_moves;

-- Audit #11 NAHRADIŤ — drop open demo insert
DROP POLICY IF EXISTS "demo_insert_pipeline_moves" ON public.pipeline_moves;

DROP POLICY IF EXISTS "pipeline_moves_tenant_select" ON public.pipeline_moves;
CREATE POLICY "pipeline_moves_tenant_select"
  ON public.pipeline_moves
  FOR SELECT
  TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM public.leads
      WHERE agency_id IS NULL
        OR agency_id IN (SELECT public.profile_agencies_for_auth())
    )
  );

DROP POLICY IF EXISTS "pipeline_moves_tenant_write" ON public.pipeline_moves;
CREATE POLICY "pipeline_moves_tenant_write"
  ON public.pipeline_moves
  FOR INSERT
  TO authenticated
  WITH CHECK (
    lead_id IN (
      SELECT id FROM public.leads
      WHERE agency_id IS NULL
        OR agency_id IN (SELECT public.profile_agencies_for_auth())
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- NOT TOUCHED in this migration
-- - onboarding_sessions "Allow anon access" — PRESUNÚŤ NA SERVER (audit #8)
-- - lead_assignment_rules demo_* — NEJASNÉ, no agency_id (audit #12–15)
-- ═══════════════════════════════════════════════════════════════════════════

COMMIT;
