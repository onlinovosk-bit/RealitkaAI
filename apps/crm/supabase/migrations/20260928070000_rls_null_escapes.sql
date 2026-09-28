-- RLS-NULL-ESCAPES: remove the `agency_id IS NULL OR ...` disjunct from the
-- tenant policies of ten tables.
--
-- What the disjunct actually does
-- ==============================
-- `agency_id IS NULL OR agency_id IN (…my agencies…)` reads as a tenant check
-- and admits every row that cannot be attributed. Because a policy's USING also
-- decides who may READ a row, one authenticated user inserting a row with a NULL
-- agency_id makes it visible to EVERY other tenant. AP-024
-- (docs/reports/2026-09-27-migration-history-reconcile.md) measured 26 such
-- policies across 16 tables; eleven route through `leads.agency_id`, which is
-- NOT NULL on production, so they are unreachable. These ten carry their own
-- nullable agency_id and have the disjunct on INSERT or ALL for `authenticated`,
-- which makes them reachable by anyone with an account.
--
-- Rows with a NULL agency_id in these ten tables on production, measured
-- 2026-09-27: 0. So this changes no row's visibility today; it closes the way
-- such a row could be created.
--
-- Why the policy and not NOT NULL
-- ===============================
-- `ALTER COLUMN agency_id SET NOT NULL` would be the more durable fix: it makes
-- the disjunct unreachable forever. It is deliberately NOT done here. RLS never
-- applied to the service role, so a NOT NULL would newly break every
-- service-role writer that omits agency_id — a larger blast radius than the
-- security boundary this gate is about. The policy IS the boundary; it is what
-- this migration changes.
--
-- Two writers are fixed in the same commit
-- ========================================
-- lib/l99/bri-engine.ts (bri_history) and lib/l99/alert-dispatch.ts
-- (priority_alerts) run as `authenticated` and did not supply agency_id at all:
-- they passed only BECAUSE of the disjunct. Without the code change this
-- migration would turn a silent cross-tenant write into a silent no-op. Both
-- tables are empty on production, so neither path has ever produced a row.

-- ─── The eight whose tenant policy is `<table>_tenant` and whose body is
-- ─── identical: agency_id IS NULL OR agency_id IN (profile_agencies_for_auth())
DO $$
DECLARE
  t text;
  targets text[] := array[
    'ai_actions', 'bri_history', 'client_dna', 'deal_moments',
    'deal_risk', 'lead_events', 'lead_scores', 'priority_alerts'
  ];
BEGIN
  FOREACH t IN ARRAY targets LOOP
    -- A table absent from this database is not a hole to close. Guarding the
    -- table, not the policy: DROP POLICY IF EXISTS still raises 42P01 on a
    -- missing table, and CI boots Postgres 15, where that is an error.
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'RLS-NULL-ESCAPES: % absent here - nothing to rewrite', t;
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_tenant', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      'USING (agency_id IN (SELECT public.profile_agencies_for_auth())) '
      'WITH CHECK (agency_id IN (SELECT public.profile_agencies_for_auth()))',
      t || '_tenant', t
    );
  END LOOP;
END $$;

-- ─── ai_action_audit: two policies, and they scope through profiles inline
-- ─── rather than through profile_agencies_for_auth(). Kept in that form, minus
-- ─── the disjunct, so the diff is the escape and nothing else.
DO $$
BEGIN
  IF to_regclass('public.ai_action_audit') IS NULL THEN
    RAISE NOTICE 'RLS-NULL-ESCAPES: ai_action_audit absent here - nothing to rewrite';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS ai_action_audit_select_tenant ON public.ai_action_audit';
  EXECUTE 'CREATE POLICY ai_action_audit_select_tenant ON public.ai_action_audit '
          'FOR SELECT TO authenticated USING (agency_id IN ('
          'SELECT p.agency_id FROM public.profiles p '
          'WHERE p.auth_user_id = auth.uid() AND p.agency_id IS NOT NULL))';

  EXECUTE 'DROP POLICY IF EXISTS ai_action_audit_insert_tenant ON public.ai_action_audit';
  EXECUTE 'CREATE POLICY ai_action_audit_insert_tenant ON public.ai_action_audit '
          'FOR INSERT TO authenticated WITH CHECK (agency_id IN ('
          'SELECT p.agency_id FROM public.profiles p '
          'WHERE p.auth_user_id = auth.uid() AND p.agency_id IS NOT NULL))';
END $$;

-- ─── properties: the correct policy already exists. `properties_tenant` is
-- ─── FOR ALL TO authenticated with a clean `agency_id IN
-- ─── (profile_agencies_for_auth())`. The four `properties_*_agency` policies
-- ─── add the disjunct, and because policies are OR-ed they VOID the correct
-- ─── one. So here the fix is to drop them, not to rewrite anything.
DO $$
BEGIN
  IF to_regclass('public.properties') IS NULL THEN
    RAISE NOTICE 'RLS-NULL-ESCAPES: properties absent here - nothing to drop';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS properties_select_agency ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS properties_insert_agency ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS properties_update_agency ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS properties_delete_agency ON public.properties';
END $$;
