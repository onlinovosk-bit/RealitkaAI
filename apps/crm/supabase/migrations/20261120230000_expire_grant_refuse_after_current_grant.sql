-- Put the "current-period grant already applied" refuse into expire_grant_credits
-- under the same FOR UPDATE lock as the zeroing write.
--
-- History: TS-only guard landed via #452 / #374. Atomic RPC migration
-- `20260804230000_atomic_credit_mutations.sql` never carried the check into SQL.
-- A later restore (`20260928120000_…`) was lost when #370 was reverted.
--
-- Without this guard the unlocked JS check then RPC path still races:
--   1. expireGrantCreditsForAgency sees no current-period grant ledger row
--   2. concurrent checkout / credits-grant / sibling cycle applies monthly grant
--   3. expire_grant_credits zeroes grant_credits_balance (including the new grant)
--   4. monthly grant idempotency key already exists → retry cannot re-grant
--
-- Key format must match `monthlyGrantIdempotencyKey`: `grant:<agency_id>:<YYYYMM>`.
-- Guard does not apply when expiring the current period itself.

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
  v_current_period text;
  v_current_grant_key text;
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

  -- refuse expire: current-period grant already applied
  v_current_period := to_char((now() AT TIME ZONE 'utc'), 'YYYYMM');
  v_current_grant_key := 'grant:' || p_agency_id::text || ':' || v_current_period;

  IF p_period_key IS DISTINCT FROM v_current_period AND EXISTS (
    SELECT 1 FROM public.credit_ledger WHERE idempotency_key = v_current_grant_key
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'skipped', true,
      'expired', 0,
      'reason', 'current_period_grant_applied'
    );
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
