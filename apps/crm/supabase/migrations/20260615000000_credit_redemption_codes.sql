-- G2 starter pack: kreditové kódy z low-ticket balíka (47 €)
CREATE TABLE IF NOT EXISTS public.credit_redemption_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  value integer NOT NULL DEFAULT 47 CHECK (value > 0),
  stripe_session_id text,
  purchaser_email text,
  redeemed_by_agency uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS credit_redemption_codes_code_uq
  ON public.credit_redemption_codes (code);

CREATE UNIQUE INDEX IF NOT EXISTS credit_redemption_codes_stripe_session_uq
  ON public.credit_redemption_codes (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS credit_redemption_codes_unredeemed_idx
  ON public.credit_redemption_codes (created_at DESC)
  WHERE redeemed_at IS NULL;
