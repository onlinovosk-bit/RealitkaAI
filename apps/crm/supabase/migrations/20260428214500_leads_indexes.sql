-- Performance indexes for frequent lead lookups and sorting.
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads (email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads (phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'agent_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON public.leads (agent_id)';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'bri_score'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_leads_bri_score ON public.leads (bri_score)';
  END IF;
END $$;
