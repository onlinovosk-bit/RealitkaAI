-- RLS for lead_closing_windows, lead_rescue_runs, lead_micro_actions
-- All three tables have agency_id; use profile_agencies_for_auth() consistent with enterprise pattern

ALTER TABLE public.lead_closing_windows  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_rescue_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_micro_actions    ENABLE ROW LEVEL SECURITY;

-- lead_closing_windows
CREATE POLICY "closing_windows_tenant"
  ON public.lead_closing_windows
  USING (
    agency_id IS NULL
    OR agency_id IN (SELECT public.profile_agencies_for_auth())
  );

-- lead_rescue_runs
CREATE POLICY "rescue_runs_tenant"
  ON public.lead_rescue_runs
  USING (
    agency_id IS NULL
    OR agency_id IN (SELECT public.profile_agencies_for_auth())
  );

-- lead_micro_actions
CREATE POLICY "micro_actions_tenant"
  ON public.lead_micro_actions
  USING (
    agency_id IS NULL
    OR agency_id IN (SELECT public.profile_agencies_for_auth())
  );
