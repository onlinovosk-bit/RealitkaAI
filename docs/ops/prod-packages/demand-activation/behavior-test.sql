-- ============================================================================
-- behavior-test.sql — BALÍK A. NIE JE verify-*: v transakcii na chvíľu vloží
-- 1 testovací riadok, zmeria viditeľnosť pre roly a na konci ROLLBACK
-- (po skončení nezostane nič). Spúšťať LEN PO apply.sql a LEN s GO foundera.
--
-- Čo dokazuje (P19): tenant A vidí svoj riadok, tenant B nie, anon nemá prístup,
-- authenticated nemôže zapisovať. Používa existujúce dáta (agentúra s profilom
-- a leadom + iná agentúra s profilom). Ak ich niet, skončí chybou NEDOSTATOK DAT.
-- Pozn.: ak váš editor beží skript v jednej vlastnej transakcii, ROLLBACK na konci
-- aj tak platí. Ak by editor zlyhal uprostred, spustite samostatne `ROLLBACK;`.
-- ============================================================================
BEGIN;

DO $bt$
DECLARE
  a_agency uuid;
  a_lead   text;
  a_user   uuid;
  b_user   uuid;
  n        bigint;
  res      jsonb := '[]'::jsonb;
BEGIN
  SELECT l.agency_id, l.id, p.auth_user_id INTO a_agency, a_lead, a_user
    FROM public.leads l
    JOIN public.profiles p ON p.agency_id = l.agency_id AND p.auth_user_id IS NOT NULL
   WHERE l.agency_id IS NOT NULL
   LIMIT 1;
  SELECT p.auth_user_id INTO b_user
    FROM public.profiles p
   WHERE p.auth_user_id IS NOT NULL AND p.agency_id IS NOT NULL AND p.agency_id <> a_agency
   LIMIT 1;
  IF a_agency IS NULL OR b_user IS NULL THEN
    RAISE EXCEPTION 'NEDOSTATOK DAT: potrebná agentúra s leadom+profilom a ďalšia agentúra s profilom';
  END IF;

  -- zápis ako vlastník (v transakcii, vráti sa ROLLBACKom)
  INSERT INTO public.lead_demands (agency_id, lead_id, status, demand, extractor)
  VALUES (a_agency, a_lead, 'disabled', '{}'::jsonb, 'behavior-test');

  -- tenant A
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a_user, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', a_user::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.lead_demands WHERE extractor = 'behavior-test';
  res := res || jsonb_build_array(jsonb_build_object('o', 1, 'kontrola', 'tenant A vidi svoj riadok', 'ocakavane', '1', 'skutocne', n::text));
  BEGIN
    INSERT INTO public.lead_demands (agency_id, lead_id, status, demand, extractor)
    VALUES (a_agency, a_lead, 'disabled', '{}'::jsonb, 'behavior-test-write');
    res := res || jsonb_build_array(jsonb_build_object('o', 4, 'kontrola', 'authenticated INSERT', 'ocakavane', 'denied', 'skutocne', 'POVOLENY (CHYBA)'));
  EXCEPTION WHEN insufficient_privilege THEN
    res := res || jsonb_build_array(jsonb_build_object('o', 4, 'kontrola', 'authenticated INSERT', 'ocakavane', 'denied', 'skutocne', 'denied'));
  END;
  RESET ROLE;

  -- tenant B
  PERFORM set_config('request.jwt.claims', json_build_object('sub', b_user, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', b_user::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.lead_demands WHERE extractor = 'behavior-test';
  res := res || jsonb_build_array(jsonb_build_object('o', 2, 'kontrola', 'tenant B NEVIDI cudzi riadok', 'ocakavane', '0', 'skutocne', n::text));
  RESET ROLE;

  -- anon
  SET LOCAL ROLE anon;
  BEGIN
    SELECT count(*) INTO n FROM public.lead_demands;
    res := res || jsonb_build_array(jsonb_build_object('o', 3, 'kontrola', 'anon SELECT', 'ocakavane', 'denied', 'skutocne', 'POVOLENY (CHYBA), riadkov ' || n));
  EXCEPTION WHEN insufficient_privilege THEN
    res := res || jsonb_build_array(jsonb_build_object('o', 3, 'kontrola', 'anon SELECT', 'ocakavane', 'denied', 'skutocne', 'denied'));
  END;
  RESET ROLE;

  PERFORM set_config('wp6.res', res::text, true);
END
$bt$;

SELECT (e->>'o')::int AS ord, e->>'kontrola' AS kontrola, e->>'ocakavane' AS ocakavane, e->>'skutocne' AS skutocne,
       (e->>'ocakavane' = e->>'skutocne') AS ok
FROM jsonb_array_elements(current_setting('wp6.res')::jsonb) AS e
ORDER BY 1;

ROLLBACK;
