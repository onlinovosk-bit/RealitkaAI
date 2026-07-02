ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS account_tier           text,
  ADD COLUMN IF NOT EXISTS subscription_status     text,
  ADD COLUMN IF NOT EXISTS seats                   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_balance         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_source          text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS billing_updated_at      timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS agencies_stripe_customer_uq
  ON public.agencies (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  ref text,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_idem_uq ON public.credit_ledger (idempotency_key);
CREATE INDEX IF NOT EXISTS credit_ledger_agency_idx ON public.credit_ledger (agency_id, created_at DESC);
