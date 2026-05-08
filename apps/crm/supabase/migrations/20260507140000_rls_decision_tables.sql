-- RLS for lead_closing_windows, lead_rescue_runs, lead_micro_actions
-- Conditional: tables may not exist in all environments

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lead_closing_windows') THEN
    ALTER TABLE public.lead_closing_windows ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_closing_windows' AND policyname='closing_windows_tenant') THEN
      CREATE POLICY "closing_windows_tenant" ON public.lead_closing_windows
        USING (agency_id IS NULL OR agency_id IN (SELECT public.profile_agencies_for_auth()));
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lead_rescue_runs') THEN
    ALTER TABLE public.lead_rescue_runs ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_rescue_runs' AND policyname='rescue_runs_tenant') THEN
      CREATE POLICY "rescue_runs_tenant" ON public.lead_rescue_runs
        USING (agency_id IS NULL OR agency_id IN (SELECT public.profile_agencies_for_auth()));
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lead_micro_actions') THEN
    ALTER TABLE public.lead_micro_actions ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_micro_actions' AND policyname='micro_actions_tenant') THEN
      CREATE POLICY "micro_actions_tenant" ON public.lead_micro_actions
        USING (agency_id IS NULL OR agency_id IN (SELECT public.profile_agencies_for_auth()));
    END IF;
  END IF;
END $$;
