-- Customer health daily alerts (founder silence watchdog).
-- PREPARE ONLY — do NOT apply via db push from CI.
-- Prod schema_migrations is in drift; founder applies in Supabase Dashboard SQL Editor, then:
--   INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
--   VALUES ('20260903070000', 'customer_health_daily', ARRAY[]::text[], NULL);

CREATE TABLE IF NOT EXISTS public.customer_health_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  checked_on date NOT NULL,
  severity text NOT NULL CHECK (severity IN ('orange', 'red')),
  is_paying boolean NOT NULL DEFAULT false,
  agency_name text NOT NULL DEFAULT '',
  signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, checked_on)
);

CREATE INDEX IF NOT EXISTS idx_customer_health_daily_checked_on
  ON public.customer_health_daily (checked_on DESC);

CREATE INDEX IF NOT EXISTS idx_customer_health_daily_severity
  ON public.customer_health_daily (severity, checked_on DESC);

COMMENT ON TABLE public.customer_health_daily IS
  'Daily customer silence alerts for founder (no customer email). Applied manually.';

ALTER TABLE public.customer_health_daily ENABLE ROW LEVEL SECURITY;

-- No authenticated policies — service_role / cron only (fail closed for clients).
