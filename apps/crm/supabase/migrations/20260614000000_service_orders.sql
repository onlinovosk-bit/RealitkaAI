-- G1 order bump: DFY migrácia pri seat checkoute
CREATE TABLE IF NOT EXISTS public.service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  paid_at timestamptz,
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS service_orders_stripe_session_uq
  ON public.service_orders (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS service_orders_agency_idx
  ON public.service_orders (agency_id, created_at DESC);
