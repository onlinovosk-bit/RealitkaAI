-- Atomic credit writers (grant / expire / purchase).
--
-- Problem: applyTopupPurchase, grantMonthlyCreditsForAgency, expireGrantCreditsForAgency
-- and starter-pack redemption used read-modify-write without row locks. Concurrent
-- Stripe top-ups (or top-up overlapping monthly credits-cycle) could overwrite each
-- other — ledger kept both entries, agencies.purchased_credits_balance lost one.
-- spend_credits already uses FOR UPDATE; credit writers did not.
--
-- These RPCs lock the agency row, insert ledger, and update balances in one transaction.

CREATE OR REPLACE FUNCTION public.apply_credit_purchase(
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
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.credit_ledger WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'credited', 0);
  END IF;

  SELECT grant_credits_balance, purchased_credits_balance
    INTO v_grant, v_purchase
    FROM public.agencies
    WHERE id = p_agency_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'agency_not_found');
  END IF;

  -- Re-check under lock (concurrent identical webhook).
  IF EXISTS (
    SELECT 1 FROM public.credit_ledger WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'credited', 0);
  END IF;

  INSERT INTO public.credit_ledger (
    agency_id, delta, reason, ref, idempotency_key, source
  ) VALUES (
    p_agency_id, p_amount, p_reason, p_ref, p_idempotency_key, 'purchase'
  );

  UPDATE public.agencies
  SET
    purchased_credits_balance = purchased_credits_balance + p_amount,
    credits_balance = grant_credits_balance + purchased_credits_balance + p_amount,
    billing_updated_at = now()
  WHERE id = p_agency_id;

  RETURN jsonb_build_object('ok', true, 'credited', p_amount, 'skipped', false);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'credited', 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_monthly_grant_credits(
  p_agency_id uuid,
  p_amount integer,
  p_period_key text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'granted', 0);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.credit_ledger WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'granted', 0);
  END IF;

  PERFORM 1 FROM public.agencies WHERE id = p_agency_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'agency_not_found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.credit_ledger WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'granted', 0);
  END IF;

  INSERT INTO public.credit_ledger (
    agency_id, delta, reason, ref, idempotency_key, source
  ) VALUES (
    p_agency_id, p_amount, 'monthly_grant', p_period_key, p_idempotency_key, 'grant'
  );

  UPDATE public.agencies
  SET
    grant_credits_balance = grant_credits_balance + p_amount,
    credits_balance = grant_credits_balance + p_amount + purchased_credits_balance,
    billing_updated_at = now()
  WHERE id = p_agency_id;

  RETURN jsonb_build_object('ok', true, 'granted', p_amount, 'skipped', false);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'granted', 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_grant_credits(
  p_agency_id uuid,
  p_period_key text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grant integer;
  v_purchase integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.credit_ledger WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'expired', 0);
  END IF;

  SELECT grant_credits_balance, purchased_credits_balance
    INTO v_grant, v_purchase
    FROM public.agencies
    WHERE id = p_agency_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'agency_not_found');
  END IF;

  IF v_grant IS NULL OR v_grant <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'expired', 0);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.credit_ledger WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'expired', 0);
  END IF;

  INSERT INTO public.credit_ledger (
    agency_id, delta, reason, ref, idempotency_key, source
  ) VALUES (
    p_agency_id, -v_grant, 'grant_expiry', p_period_key, p_idempotency_key, 'grant'
  );

  UPDATE public.agencies
  SET
    grant_credits_balance = 0,
    credits_balance = purchased_credits_balance,
    billing_updated_at = now()
  WHERE id = p_agency_id;

  RETURN jsonb_build_object('ok', true, 'expired', v_grant, 'skipped', false);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'expired', 0);
END;
$$;
