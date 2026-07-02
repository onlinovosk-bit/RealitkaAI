-- Activation checklist 1a: manual invoice plan for agencies without Stripe subscription.
-- Smolko: UPDATE agencies SET manual_plan = 'market_vision' WHERE id = '11111111-1111-1111-1111-111111111111';
-- Code read path (1c) is a separate PR — do not remove saas-ops overrides until 1b applied on prod.

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS manual_plan text;

COMMENT ON COLUMN public.agencies.manual_plan IS
  'Plan key when billing_source is manual_invoice (starter|pro|scale|market_vision|free). Used when stripe subscription absent.';

CREATE INDEX IF NOT EXISTS agencies_manual_plan_idx
  ON public.agencies (manual_plan)
  WHERE manual_plan IS NOT NULL;
