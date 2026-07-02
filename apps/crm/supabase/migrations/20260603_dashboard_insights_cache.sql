-- Dashboard AI insights cache (cron-generated, per agency tenant)
CREATE TABLE IF NOT EXISTS public.dashboard_insights_cache (
  agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_insights_cache_generated
  ON public.dashboard_insights_cache (generated_at DESC);

ALTER TABLE public.dashboard_insights_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboard_insights_cache_select_tenant" ON public.dashboard_insights_cache;
CREATE POLICY "dashboard_insights_cache_select_tenant"
  ON public.dashboard_insights_cache
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (SELECT public.profile_agencies_for_auth())
  );

COMMENT ON TABLE public.dashboard_insights_cache IS
  'Precomputed dashboard AI insights per agency; written by /api/cron/dashboard-insights.';
