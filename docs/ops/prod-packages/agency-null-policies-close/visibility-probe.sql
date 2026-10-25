-- ============================================================================
-- visibility-probe.sql — BALÍK B. Meria, koľko riadkov vidí KAŽDÁ agentúra
-- ako rola `authenticated` (a čo vie `anon`) v tabuľkách z mapy. Nič nezapisuje:
-- beží v transakcii s ROLLBACK (SET LOCAL ROLE / set_config sú len na transakciu).
-- Spúšťa sa PRED aj PO apply.sql; výstupy sa porovnajú riadok po riadku.
-- Očakávanie po apply.sql: čísla sa NEZMENIA (ak áno, bol tam riadok viditeľný
-- cez vetvu NULL alebo sa rozbila prevádzka; obe treba vyhodnotiť pred pokračovaním).
-- Chýbajúce tabuľky/pohľady sa preskočia. Sú potrebné profily s auth_user_id;
-- agentúra bez nich sa vypíše ako 'bez profilu'.
-- ============================================================================
BEGIN;

DO $probe$
DECLARE
  tabs text[] := ARRAY['leads','activities','activity_stream','properties','lead_scores','ai_actions','ai_action_audit',
                       'bri_history','priority_alerts','pipeline_moves','platform_events','lead_events','client_dna',
                       'deal_moments','deal_risk','lead_action_scores','lead_closing_windows','lead_micro_actions',
                       'lead_rescue_runs'];
  a record;
  t text;
  n bigint;
  res jsonb := '[]'::jsonb;
BEGIN
  FOR a IN
    SELECT ag.id AS agency_id, ag.name,
           (SELECT p.auth_user_id FROM public.profiles p WHERE p.agency_id = ag.id AND p.auth_user_id IS NOT NULL ORDER BY p.created_at LIMIT 1) AS uid
      FROM public.agencies ag
     ORDER BY ag.id
  LOOP
    IF a.uid IS NULL THEN
      res := res || jsonb_build_array(jsonb_build_object('k', a.agency_id::text, 'tabulka', '-', 'hodnota', 'bez profilu'));
      CONTINUE;
    END IF;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', a.uid, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', a.uid::text, true);
    SET LOCAL ROLE authenticated;
    FOREACH t IN ARRAY tabs LOOP
      IF to_regclass('public.' || t) IS NOT NULL THEN
        BEGIN
          EXECUTE format('select count(*) from public.%I', t) INTO n;
          res := res || jsonb_build_array(jsonb_build_object('k', a.agency_id::text, 'tabulka', t, 'hodnota', n::text));
        EXCEPTION WHEN OTHERS THEN
          res := res || jsonb_build_array(jsonb_build_object('k', a.agency_id::text, 'tabulka', t, 'hodnota', 'chyba: ' || SQLERRM));
        END;
      END IF;
    END LOOP;
    RESET ROLE;
  END LOOP;

  -- anon: ocakavane vsade 'denied' (alebo 0)
  SET LOCAL ROLE anon;
  FOREACH t IN ARRAY tabs LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      BEGIN
        EXECUTE format('select count(*) from public.%I', t) INTO n;
        res := res || jsonb_build_array(jsonb_build_object('k', 'ANON', 'tabulka', t, 'hodnota', n::text));
      EXCEPTION WHEN insufficient_privilege THEN
        res := res || jsonb_build_array(jsonb_build_object('k', 'ANON', 'tabulka', t, 'hodnota', 'denied'));
      WHEN OTHERS THEN
        res := res || jsonb_build_array(jsonb_build_object('k', 'ANON', 'tabulka', t, 'hodnota', 'chyba: ' || SQLERRM));
      END;
    END IF;
  END LOOP;
  RESET ROLE;

  PERFORM set_config('wp6.probe', res::text, true);
END
$probe$;

SELECT e->>'k' AS agentura, e->>'tabulka' AS tabulka, e->>'hodnota' AS hodnota
FROM jsonb_array_elements(current_setting('wp6.probe')::jsonb) AS e
ORDER BY 1, 2;

ROLLBACK;
