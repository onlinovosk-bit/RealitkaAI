-- SIGNUP-ARCH (2026-10-06): bezpečné samoobslužné založenie agentúry.
-- Princípy: (1) agentúru zakladá IBA privilegovaná idempotentná funkcia, volateľná len service_role;
-- (2) žiadny klientsky INSERT do agencies; (3) bezpečné predvolené hodnoty (seats 0, free, zostatky 0);
-- (4) trial je ukotvený na agentúre (trial_ends_at), nie na auth.users.created_at;
-- (5) e-mail musí byť overený; (6) súhlas sa eviduje; (7) ochrana billing/trial stĺpcov proti zápisu z prehliadača.
-- Aditívne a opakovateľné; žiadny DROP dát, žiadny backfill existujúcich agentúr.

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_via   text CHECK (created_via IS NULL OR created_via IN ('operator', 'self_serve'));

COMMENT ON COLUMN public.agencies.trial_ends_at IS
  'Koniec trialu bez karty (self-serve). NULL = legacy odvodenie z auth.users.created_at.';
COMMENT ON COLUMN public.agencies.created_via IS
  'Pôvod agentúry: operator (onboard-agency) alebo self_serve (bootstrap_self_serve_agency); NULL = historická.';

CREATE TABLE IF NOT EXISTS public.account_signups (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id     uuid NOT NULL UNIQUE,
  agency_id        uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email            text NOT NULL,
  consent_version  text NOT NULL,
  consent_at       timestamptz NOT NULL DEFAULT now(),
  plan_intent      text CHECK (plan_intent IS NULL OR plan_intent IN ('start', 'team', 'office', 'network')),
  trial_days       integer NOT NULL,
  trial_credits    integer NOT NULL DEFAULT 0 CHECK (trial_credits >= 0),
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_signups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_signups FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE public.account_signups IS
  'Auditná stopa samoobslužnej registrácie (súhlas, trial). RLS bez politík = prístup len service_role.';

-- Idempotentné založenie agentúry + owner profilu. Nedôveruje argumentom: overuje auth.users.
CREATE OR REPLACE FUNCTION public.bootstrap_self_serve_agency(
  p_auth_user_id   uuid,
  p_full_name      text,
  p_phone          text,
  p_agency_name    text,
  p_plan_intent    text,
  p_consent_version text,
  p_trial_days     integer DEFAULT 14,
  p_trial_credits  integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email     text;
  v_confirmed timestamptz;
  v_agency_id uuid;
  v_profile   uuid;
  v_slug_base text;
  v_slug      text;
  v_name      text;
  v_days      integer := LEAST(GREATEST(COALESCE(p_trial_days, 14), 0), 60);
  v_credits   integer := LEAST(GREATEST(COALESCE(p_trial_credits, 0), 0), 200);
  v_intent    text := CASE WHEN p_plan_intent IN ('start', 'team', 'office', 'network') THEN p_plan_intent END;
BEGIN
  IF p_auth_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_user');
  END IF;
  IF COALESCE(btrim(p_consent_version), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'consent_required');
  END IF;

  SELECT lower(email), email_confirmed_at INTO v_email, v_confirmed
  FROM auth.users WHERE id = p_auth_user_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;
  IF v_confirmed IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_not_confirmed');
  END IF;

  -- Serializácia podľa používateľa: dvojklik / opakovaný callback nezaloží druhú agentúru.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_auth_user_id::text, 0));

  SELECT agency_id INTO v_agency_id FROM public.profiles WHERE auth_user_id = p_auth_user_id LIMIT 1;
  IF v_agency_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'created', false, 'agency_id', v_agency_id);
  END IF;

  -- Pozvaný / predvytvorený profil s týmto e-mailom: nezakladáme novú agentúru (rieši pozvánka).
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = v_email AND auth_user_id IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_exists');
  END IF;

  v_name := left(btrim(COALESCE(NULLIF(btrim(p_agency_name), ''), split_part(v_email, '@', 1))), 120);
  v_slug_base := left(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), 40);
  v_slug_base := btrim(v_slug_base, '-');
  IF v_slug_base = '' THEN v_slug_base := 'agentura'; END IF;
  v_slug := v_slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  INSERT INTO public.agencies (name, slug, plan, seats, account_tier, billing_source, is_active, trial_ends_at, created_via)
  VALUES (v_name, v_slug, 'free', 0, 'free', 'self_serve', true, now() + make_interval(days => v_days), 'self_serve')
  RETURNING id INTO v_agency_id;

  INSERT INTO public.profiles (agency_id, team_id, full_name, email, role, phone, is_active, auth_user_id)
  VALUES (v_agency_id, NULL, COALESCE(NULLIF(btrim(p_full_name), ''), v_email), v_email, 'owner',
          COALESCE(btrim(p_phone), ''), true, p_auth_user_id)
  RETURNING id INTO v_profile;

  INSERT INTO public.account_signups (auth_user_id, agency_id, email, consent_version, plan_intent, trial_days, trial_credits)
  VALUES (p_auth_user_id, v_agency_id, v_email, btrim(p_consent_version), v_intent, v_days, v_credits);

  IF v_credits > 0 THEN
    PERFORM public.apply_monthly_grant_credits(v_agency_id, v_credits, 'trial', 'trial:' || v_agency_id::text);
  END IF;

  RETURN jsonb_build_object('ok', true, 'created', true, 'agency_id', v_agency_id, 'profile_id', v_profile,
                            'trial_days', v_days, 'trial_credits', v_credits);
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_self_serve_agency(uuid, text, text, text, text, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_self_serve_agency(uuid, text, text, text, text, text, integer, integer)
  TO service_role;

-- Guard: klient (authenticated/anon) nesmie meniť billing/trial/tenant stĺpce agentúry.
-- Soft-revert cez jsonb, takže funguje aj keď niektorý stĺpec v danom prostredí neexistuje.
CREATE OR REPLACE FUNCTION public.agencies_guard_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  k     text;
  protected text[] := ARRAY[
    'slug', 'plan', 'seats', 'account_tier', 'billing_source', 'manual_plan', 'is_active',
    'stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'owner_cockpit_active',
    'credits_balance', 'grant_credits_balance', 'purchased_credits_balance',
    'pricing_model', 'pricing_band', 'licensed_users', 'pack_credits',
    'trial_ends_at', 'created_via'
  ];
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
     OR current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  v_old := to_jsonb(OLD);
  v_new := to_jsonb(NEW);
  FOREACH k IN ARRAY protected LOOP
    IF v_old ? k THEN
      v_new := jsonb_set(v_new, ARRAY[k], v_old -> k);
    END IF;
  END LOOP;
  RETURN jsonb_populate_record(NEW, v_new);
END;
$$;

DROP TRIGGER IF EXISTS agencies_guard_protected_columns ON public.agencies;
CREATE TRIGGER agencies_guard_protected_columns
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.agencies_guard_protected_columns();

-- Hardening: zhoda podľa e-mailu platí len pre OVERENÝ e-mail. Bez toho by si útočník mohol zaregistrovať
-- cudzí (neoverený) e-mail a cez e-mailovú vetvu zdediť tenant s profilom na ten e-mail.
-- PROD 2026-10-06: 0 neprepojených profilov sa zhoduje s existujúcim auth používateľom → zmena nikoho nepoloží.
CREATE OR REPLACE FUNCTION public.profile_agencies_for_auth()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select distinct p.agency_id
  from public.profiles p
  cross join lateral (
    select u.email::text as email, u.email_confirmed_at as confirmed_at
    from auth.users u where u.id = auth.uid()
  ) me
  where p.agency_id is not null
    and (
      p.auth_user_id = auth.uid()
      or p.id = auth.uid()
      or (
        me.email is not null
        and me.confirmed_at is not null
        and p.email is not null
        and lower(trim(both from p.email)) = lower(trim(both from me.email))
      )
    );
$function$;
