-- Brief 4.0 Agent-R: CHECK constraint for agencies.manual_plan (idempotent).
-- Base column from 20260607210500_agencies_manual_plan.sql must exist first.

ALTER TABLE public.agencies
  DROP CONSTRAINT IF EXISTS agencies_manual_plan_check;

ALTER TABLE public.agencies
  ADD CONSTRAINT agencies_manual_plan_check
  CHECK (
    manual_plan IS NULL
    OR manual_plan IN (
      'free', 'starter', 'pro', 'scale',
      'market_vision', 'protocol_authority',
      'active_force', 'enterprise'
    )
  );

COMMENT ON COLUMN public.agencies.manual_plan IS
  'Manual plan override for non-Stripe customers (e.g. invoice billing).
   Takes precedence over Stripe price_id when set in application code.
   Reality Smolko: market_vision';
