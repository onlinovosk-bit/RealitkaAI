-- Replace open "demo" policies on tasks and ai_recommendations
-- with proper tenant-scoped policies via profile_agencies_for_auth()

-- ─── tasks ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "demo_select_tasks"   ON public.tasks;
DROP POLICY IF EXISTS "demo_insert_tasks"   ON public.tasks;
DROP POLICY IF EXISTS "demo_update_tasks"   ON public.tasks;
DROP POLICY IF EXISTS "demo_delete_tasks"   ON public.tasks;

CREATE POLICY "tasks_agency"
  ON public.tasks
  FOR ALL
  USING (
    lead_id IN (
      SELECT id FROM public.leads
      WHERE agency_id = ANY(profile_agencies_for_auth())
    )
  )
  WITH CHECK (
    lead_id IN (
      SELECT id FROM public.leads
      WHERE agency_id = ANY(profile_agencies_for_auth())
    )
  );

-- ─── ai_recommendations ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "demo_select_ai_recommendations" ON public.ai_recommendations;
DROP POLICY IF EXISTS "demo_insert_ai_recommendations" ON public.ai_recommendations;
DROP POLICY IF EXISTS "demo_update_ai_recommendations" ON public.ai_recommendations;

CREATE POLICY "ai_recommendations_agency"
  ON public.ai_recommendations
  FOR ALL
  USING (
    lead_id IN (
      SELECT id FROM public.leads
      WHERE agency_id = ANY(profile_agencies_for_auth())
    )
  )
  WITH CHECK (
    lead_id IN (
      SELECT id FROM public.leads
      WHERE agency_id = ANY(profile_agencies_for_auth())
    )
  );
