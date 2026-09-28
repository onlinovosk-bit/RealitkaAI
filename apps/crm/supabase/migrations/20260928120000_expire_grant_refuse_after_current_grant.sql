-- Vráť do `expire_grant_credits` poistku, ktorú stratil prechod na atomické RPC.
--
-- Pôvodná TS implementácia (`expireGrantCreditsForAgency`) pred zmazaním grant
-- poolu overovala, či už v ledgeri nie je mesačný grant za AKTUÁLNY period:
--
--     if (currentGrant.exists) {
--       // wiping now would delete the new monthly grant
--       return { expired: 0, skipped: true };
--     }
--
-- `20260804230000_atomic_credit_mutations.sql` túto kontrolu neprebral — RPC
-- pozerá len na idempotency kľúč samotnej expirácie. Bez nej platí:
--
--   1. mesačný cron spustí expire za 202508 → zlyhá (transient),
--   2. ten istý cron udelí grant za 202509 → `grant_credits_balance` je nový grant,
--   3. retry spustí expire za 202508 → expiry kľúč v ledgeri nie je,
--      RPC nastaví `grant_credits_balance = 0` a zapíše `-v_grant`,
--      kde `v_grant` je ten PRÁVE UDELENÝ grant.
--
-- Klient tým príde o kredity za mesiac, ktoré dostal pred pár sekundami.
-- Funkcia sa nahrádza celá (CREATE OR REPLACE), pridaný je iba tretí guard.

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
  --
  -- Kľúč musí zodpovedať `monthlyGrantIdempotencyKey` v
  -- `src/lib/credits/grant-idempotency.ts` — `grant:<agency_id>:<YYYYMM>`.
  -- Neplatí to pre prípad, keď expirujeme práve aktuálny period: vtedy je
  -- prítomnosť jeho grantu očakávaná a nie je čo chrániť.
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
