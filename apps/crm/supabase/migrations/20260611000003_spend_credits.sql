-- PR-2 gap: spend_credits (grant pred purchase) + backfill legacy ledger source

-- Riadky pred grant engine: purchase (nie mesačný grant / expiry)
UPDATE public.credit_ledger
SET source = 'purchase'
WHERE source = 'grant'
  AND reason NOT IN ('monthly_grant', 'grant_expiry');

CREATE OR REPLACE FUNCTION public.spend_credits(
  p_agency_id uuid,
  p_amount integer,
  p_reason text,
  p_idempotency_key text,
  p_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grant integer;
  v_purchase integer;
  v_from_grant integer;
  v_from_purchase integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.credit_ledger
    WHERE idempotency_key IN (p_idempotency_key, p_idempotency_key || ':purchase')
  ) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'spent', 0);
  END IF;

  SELECT grant_credits_balance, purchased_credits_balance
    INTO v_grant, v_purchase
    FROM public.agencies
    WHERE id = p_agency_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'agency_not_found');
  END IF;

  IF (v_grant + v_purchase) < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_credits');
  END IF;

  v_from_grant := LEAST(v_grant, p_amount);
  v_from_purchase := p_amount - v_from_grant;

  IF v_from_grant > 0 THEN
    INSERT INTO public.credit_ledger (
      agency_id, delta, reason, ref, idempotency_key, source
    ) VALUES (
      p_agency_id, -v_from_grant, p_reason, p_ref, p_idempotency_key, 'grant'
    );
  END IF;

  IF v_from_purchase > 0 THEN
    INSERT INTO public.credit_ledger (
      agency_id, delta, reason, ref, idempotency_key, source
    ) VALUES (
      p_agency_id,
      -v_from_purchase,
      p_reason,
      p_ref,
      p_idempotency_key || ':purchase',
      'purchase'
    );
  END IF;

  UPDATE public.agencies
  SET
    grant_credits_balance = grant_credits_balance - v_from_grant,
    purchased_credits_balance = purchased_credits_balance - v_from_purchase,
    credits_balance = credits_balance - p_amount,
    billing_updated_at = now()
  WHERE id = p_agency_id;

  RETURN jsonb_build_object(
    'ok', true,
    'spent', p_amount,
    'from_grant', v_from_grant,
    'from_purchase', v_from_purchase
  );
END;
$$;
