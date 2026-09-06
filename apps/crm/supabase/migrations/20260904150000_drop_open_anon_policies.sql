-- 20260904150000_drop_open_anon_policies.sql
-- Applied on production 2026-09-04 — do NOT re-apply there; this file is for CI / fresh DBs only.
-- CI local schema lacks tables created only via loose SQL outside migrations/ (e.g. integration_settings).
-- Audit: docs/audit/2026-09-04-rls-anon-policies.md
-- Rollback: docs/runbooks/rollback-anon-policies.md
-- Idempotent: DROP POLICY IF EXISTS / CREATE only after drop of replaced demos.
-- Guard: DROP/CREATE on tables absent from the migration chain use to_regclass(...) IS NOT NULL
--   (Postgres DROP POLICY IF EXISTS skips missing policies, not missing relations).

BEGIN;

-- ============================================================================
-- 1. integration_settings — ZRUŠIŤ (audit #1–4)
--    Open demo policies expose imap_password to anon. No app code references.
--    Table exists in prod via loose SQL (17_add_integration_settings.sql), not in migrations/.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.integration_settings') IS NOT NULL THEN
    DROP POLICY IF EXISTS "demo_select_integration_settings" ON public.integration_settings;
    DROP POLICY IF EXISTS "demo_insert_integration_settings" ON public.integration_settings;
    DROP POLICY IF EXISTS "demo_update_integration_settings" ON public.integration_settings;
    DROP POLICY IF EXISTS "demo_delete_integration_settings" ON public.integration_settings;
  END IF;
END $$;

-- ============================================================================
-- 2. activities — ZRUŠIŤ (audit #5–6)
--    Tenant policies for authenticated already exist (activities_tenant_*).
--    Present in migrations baseline — unguarded.
-- ============================================================================

DROP POLICY IF EXISTS "activities_anon_legacy_all" ON public.activities;
DROP POLICY IF EXISTS "activities_anon_insert" ON public.activities;

-- ============================================================================
-- 3. properties — ZRUŠIŤ (audit #7)
--    No repo origin; authenticated insert policies already exist.
--    Present in migrations baseline — unguarded.
-- ============================================================================

DROP POLICY IF EXISTS "properties_anon_insert" ON public.properties;

-- ============================================================================
-- 4. lead_property_matches — ZRUŠIŤ (audit #9)
--    Present in migrations baseline — unguarded.
-- ============================================================================

DROP POLICY IF EXISTS "matches_anon_legacy_all" ON public.lead_property_matches;

-- ============================================================================
-- 5. pipeline_moves — NAHRADIŤ (audit #10–11)
--    Pattern: activities_tenant_select / activities_tenant_write via lead → agency.
--    Table exists in prod via loose SQL (03_pipeline_moves.sql), not in migrations/.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.pipeline_moves') IS NOT NULL THEN
    DROP POLICY IF EXISTS "demo_select_pipeline_moves" ON public.pipeline_moves;
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
  END IF;
END $$;

-- ============================================================================
-- 6. lead_assignment_rules — ZRUŠIŤ (audit #12–15; reclassified 2026-09-04)
--    0 rows, no agency_id, feature not in production use. Close open demo_* now;
--    tenant policies land later with agency_id schema when the feature is revived.
--    Table exists in prod via loose SQL (13_add_lead_assignment_rules.sql), not in migrations/.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.lead_assignment_rules') IS NOT NULL THEN
    DROP POLICY IF EXISTS "demo_select_lead_assignment_rules" ON public.lead_assignment_rules;
    DROP POLICY IF EXISTS "demo_insert_lead_assignment_rules" ON public.lead_assignment_rules;
    DROP POLICY IF EXISTS "demo_update_lead_assignment_rules" ON public.lead_assignment_rules;
    DROP POLICY IF EXISTS "demo_delete_lead_assignment_rules" ON public.lead_assignment_rules;
  END IF;
END $$;

-- ============================================================================
-- NOT TOUCHED in this migration
-- - onboarding_sessions "Allow anon access" — deferred to
--   20260904220000_drop_onboarding_sessions_anon_all.sql (TASK-RLS-ONBOARDING-SESSION Path B)
-- ============================================================================

COMMIT;