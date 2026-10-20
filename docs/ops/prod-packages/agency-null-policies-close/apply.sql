-- ============================================================================
-- NEAPLIKOVAŤ BEZ GO FOUNDERA.
--
-- BALÍK B „agency-null-policies-close": zavrie RLS politiky s vetvou
-- `agency_id IS NULL` (riadok bez vlastníka je viditeľný/zapisovateľný každému
-- prihlásenému) a zúži EXECUTE na jednej SECURITY DEFINER funkcii, ktorú volá
-- iba service role (rls_audit_snapshot).
--
-- Odomykacie slovo:   GO NULL-POLICIES
-- Spúšťa:             founder (alebo agent až po tomto slove), jedno spustenie.
-- Predtým:            verify-before.sql + visibility-probe.sql (výstupy uložiť)
-- Potom:              verify-after.sql + visibility-probe.sql, porovnať (P19)
-- Návrat:             rollback.sql (číta zálohu, ktorú si tento skript sám vytvorí)
--
-- Stav PROD je UNVERIFIED (autor nemal prístup do PROD). Skript preto NEPREDPOKLADÁ,
-- ktoré politiky v PROD žijú: nájde ich dynamicky (pg_policies) a každú nájdenú
-- s vetvou agency_id IS NULL prepíše podľa mapy nižšie (= definícia z repa po
-- všetkých migráciách, overená replayom na čistej DB). Ak nájde politiku, ktorú
-- mapa nepozná, ALEBO riadky s agency_id IS NULL, ktoré by prepísanie skrylo,
-- ZASTAVÍ SA (ROLLBACK celej transakcie, nič sa nezmení).
--
-- Mimo rozsahu tohto skriptu (zámerne): SECURITY DEFINER funkcie okrem
-- rls_audit_snapshot (volajú ich session/cron; viď mapa-ciest.md, fáza 2) a
-- iné NULL-vetvy než agency_id (profile_id / lead_id IS NULL; viď mapa-ciest.md §4).
-- ============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- ---------------------------------------------------------------------------
-- 0) Predpoklady
-- ---------------------------------------------------------------------------
DO $pre$
BEGIN
  IF to_regprocedure('public.profile_agencies_for_auth()') IS NULL THEN
    RAISE EXCEPTION 'PREDPOKLAD: public.profile_agencies_for_auth() neexistuje (nové politiky by nešlo vytvoriť)';
  END IF;
  IF NOT has_function_privilege('authenticated', to_regprocedure('public.profile_agencies_for_auth()'), 'EXECUTE') THEN
    RAISE EXCEPTION 'PREDPOKLAD: authenticated nemá EXECUTE na profile_agencies_for_auth() — RLS by padla; najprv opraviť';
  END IF;
END
$pre$;

-- ---------------------------------------------------------------------------
-- 1) Záloha pre rollback.sql (samostatná schéma mimo public, nie je v API;
--    schema-governance-guard kontroluje len public). Prvá záloha sa nikdy
--    neprepisuje: rollback berie najstaršiu.
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS wp6_backup;
REVOKE ALL ON SCHEMA wp6_backup FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS wp6_backup.policies_before (
  captured_at timestamptz NOT NULL,
  schemaname  name        NOT NULL,
  tablename   name        NOT NULL,
  policyname  name        NOT NULL,
  permissive  text        NOT NULL,
  roles       name[]      NOT NULL,
  cmd         text        NOT NULL,
  qual        text,
  with_check  text
);
CREATE TABLE IF NOT EXISTS wp6_backup.function_acl_before (
  captured_at timestamptz NOT NULL,
  signature   text        NOT NULL,
  proacl      text
);
ALTER TABLE wp6_backup.policies_before    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp6_backup.function_acl_before ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wp6_backup.policies_before, wp6_backup.function_acl_before FROM PUBLIC, anon, authenticated;

INSERT INTO wp6_backup.policies_before
SELECT now(), p.schemaname, p.tablename, p.policyname, p.permissive, p.roles, p.cmd, p.qual, p.with_check
  FROM pg_policies p
 WHERE p.schemaname = 'public'
   AND ((COALESCE(p.qual, '') || ' ' || COALESCE(p.with_check, '')) ~* 'agency_id\s+is\s+null'
        OR (p.tablename = 'activities' AND p.policyname IN ('activities_insert_agency', 'activities_select_agency')));

INSERT INTO wp6_backup.function_acl_before
SELECT now(), p.oid::regprocedure::text, p.proacl::text
  FROM pg_proc p
 WHERE p.oid = to_regprocedure('public.rls_audit_snapshot()');

-- ---------------------------------------------------------------------------
-- 2) Staré politiky na `activities` (únik riadkov bez leadu). Idempotentné.
--    activities_insert_agency sa zruší LEN ak už existuje náhrada z
--    20261001170000 (stĺpec agency_id + trigger + politika activities_agency_insert);
--    inak by zápisy `matching` bez leadu ticho zlyhali.
-- ---------------------------------------------------------------------------
DO $act$
BEGIN
  IF to_regclass('public.activities') IS NULL THEN
    RETURN;
  END IF;

  DROP POLICY IF EXISTS activities_select_agency ON public.activities;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activities' AND policyname = 'activities_insert_agency') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'agency_id')
       AND EXISTS (SELECT 1 FROM pg_trigger
                    WHERE tgrelid = 'public.activities'::regclass AND tgname = 'activities_fill_agency_trg' AND NOT tgisinternal)
       AND EXISTS (SELECT 1 FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = 'activities' AND policyname = 'activities_agency_insert')
    THEN
      DROP POLICY activities_insert_agency ON public.activities;
    ELSE
      RAISE EXCEPTION 'PREDPOKLAD: activities_insert_agency existuje, ale náhrada (activities.agency_id + trigger activities_fill_agency_trg + politika activities_agency_insert z 20261001170000) chýba; najprv ju aplikovať';
    END IF;
  END IF;
END
$act$;

-- ---------------------------------------------------------------------------
-- 3) Mapa: (tabuľka, politika) -> cieľová definícia bez vetvy NULL.
--    Zdroj: pg_policies po replayi VŠETKÝCH migrácií z repa na čistej DB
--    (apps/crm/supabase/migrations/**), okrem dvoch politík na `activities`,
--    ktoré v repe vetvu NULL (cez leads.agency_id) ešte nesú — tu sú bez nej.
--    Stĺpec chk_tab = tabuľka, v ktorej sa pred prepísaním overí, že nie sú
--    riadky s agency_id IS NULL (prepísanie by ich skrylo).
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE pmap (
  tablename  text NOT NULL,
  policyname text NOT NULL,
  chk_tab    text NOT NULL,
  create_sql text NOT NULL,
  PRIMARY KEY (tablename, policyname)
) ON COMMIT DROP;

INSERT INTO pmap (tablename, policyname, chk_tab, create_sql) VALUES
  ('activities', 'activities_tenant_select', 'leads', $q$CREATE POLICY activities_tenant_select ON public.activities AS PERMISSIVE FOR SELECT TO authenticated USING (lead_id IN ( SELECT leads.id FROM leads WHERE (leads.agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))))$q$),
  ('activities', 'activities_tenant_write', 'leads', $q$CREATE POLICY activities_tenant_write ON public.activities AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (lead_id IN ( SELECT leads.id FROM leads WHERE (leads.agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))))$q$),
  ('ai_action_audit', 'ai_action_audit_insert_tenant', 'ai_action_audit', $q$CREATE POLICY ai_action_audit_insert_tenant ON public.ai_action_audit AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (agency_id IN ( SELECT p.agency_id FROM profiles p WHERE ((p.auth_user_id = auth.uid()) AND (p.agency_id IS NOT NULL))))$q$),
  ('ai_action_audit', 'ai_action_audit_select_tenant', 'ai_action_audit', $q$CREATE POLICY ai_action_audit_select_tenant ON public.ai_action_audit AS PERMISSIVE FOR SELECT TO authenticated USING (agency_id IN ( SELECT p.agency_id FROM profiles p WHERE ((p.auth_user_id = auth.uid()) AND (p.agency_id IS NOT NULL))))$q$),
  ('ai_actions', 'ai_actions_tenant', 'ai_actions', $q$CREATE POLICY ai_actions_tenant ON public.ai_actions AS PERMISSIVE FOR ALL TO authenticated USING (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth)) WITH CHECK (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))$q$),
  ('bri_history', 'bri_history_tenant', 'bri_history', $q$CREATE POLICY bri_history_tenant ON public.bri_history AS PERMISSIVE FOR ALL TO authenticated USING (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth)) WITH CHECK (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))$q$),
  ('client_dna', 'client_dna_tenant', 'client_dna', $q$CREATE POLICY client_dna_tenant ON public.client_dna AS PERMISSIVE FOR ALL TO authenticated USING (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth)) WITH CHECK (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))$q$),
  ('deal_moments', 'deal_moments_tenant', 'deal_moments', $q$CREATE POLICY deal_moments_tenant ON public.deal_moments AS PERMISSIVE FOR ALL TO authenticated USING (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth)) WITH CHECK (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))$q$),
  ('deal_risk', 'deal_risk_tenant', 'deal_risk', $q$CREATE POLICY deal_risk_tenant ON public.deal_risk AS PERMISSIVE FOR ALL TO authenticated USING (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth)) WITH CHECK (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))$q$),
  ('lead_action_scores', 'lead_action_scores_tenant', 'lead_action_scores', $q$CREATE POLICY lead_action_scores_tenant ON public.lead_action_scores AS PERMISSIVE FOR ALL TO authenticated USING (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth)) WITH CHECK (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))$q$),
  ('lead_closing_windows', 'closing_windows_tenant', 'lead_closing_windows', $q$CREATE POLICY closing_windows_tenant ON public.lead_closing_windows AS PERMISSIVE FOR ALL TO authenticated USING (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth)) WITH CHECK (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))$q$),
  ('lead_events', 'lead_events_tenant', 'lead_events', $q$CREATE POLICY lead_events_tenant ON public.lead_events AS PERMISSIVE FOR ALL TO authenticated USING (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth)) WITH CHECK (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))$q$),
  ('lead_micro_actions', 'micro_actions_tenant', 'lead_micro_actions', $q$CREATE POLICY micro_actions_tenant ON public.lead_micro_actions AS PERMISSIVE FOR ALL TO authenticated USING (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth)) WITH CHECK (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))$q$),
  ('lead_rescue_runs', 'rescue_runs_tenant', 'lead_rescue_runs', $q$CREATE POLICY rescue_runs_tenant ON public.lead_rescue_runs AS PERMISSIVE FOR ALL TO authenticated USING (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth)) WITH CHECK (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))$q$),
  ('lead_scores', 'lead_scores_tenant', 'lead_scores', $q$CREATE POLICY lead_scores_tenant ON public.lead_scores AS PERMISSIVE FOR ALL TO authenticated USING (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth)) WITH CHECK (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))$q$),
  ('leads', 'leads_tenant', 'leads', $q$CREATE POLICY leads_tenant ON public.leads AS PERMISSIVE FOR ALL TO authenticated USING (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth)) WITH CHECK (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))$q$),
  ('pipeline_moves', 'pipeline_moves_tenant_select', 'leads', $q$CREATE POLICY pipeline_moves_tenant_select ON public.pipeline_moves AS PERMISSIVE FOR SELECT TO authenticated USING (lead_id IN ( SELECT l.id FROM leads l WHERE (l.agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))))$q$),
  ('pipeline_moves', 'pipeline_moves_tenant_write', 'leads', $q$CREATE POLICY pipeline_moves_tenant_write ON public.pipeline_moves AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (lead_id IN ( SELECT l.id FROM leads l WHERE (l.agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))))$q$),
  ('platform_events', 'platform_events_select_tenant', 'platform_events', $q$CREATE POLICY platform_events_select_tenant ON public.platform_events AS PERMISSIVE FOR SELECT TO authenticated USING (agency_id IN ( SELECT p.agency_id FROM profiles p WHERE ((p.auth_user_id = auth.uid()) AND (p.agency_id IS NOT NULL))))$q$),
  ('priority_alerts', 'priority_alerts_tenant', 'priority_alerts', $q$CREATE POLICY priority_alerts_tenant ON public.priority_alerts AS PERMISSIVE FOR ALL TO authenticated USING (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth)) WITH CHECK (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))$q$),
  ('properties', 'properties_tenant', 'properties', $q$CREATE POLICY properties_tenant ON public.properties AS PERMISSIVE FOR ALL TO authenticated USING (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth)) WITH CHECK (agency_id IN ( SELECT profile_agencies_for_auth() AS profile_agencies_for_auth))$q$);

-- ---------------------------------------------------------------------------
-- 4) Dynamické prepísanie: každá politika v public s vetvou agency_id IS NULL
-- ---------------------------------------------------------------------------
DO $rw$
DECLARE
  r record;
  m record;
  n bigint;
  done int := 0;
BEGIN
  FOR r IN
    SELECT p.tablename, p.policyname
      FROM pg_policies p
     WHERE p.schemaname = 'public'
       AND (COALESCE(p.qual, '') || ' ' || COALESCE(p.with_check, '')) ~* 'agency_id\s+is\s+null'
     ORDER BY p.tablename, p.policyname
  LOOP
    SELECT * INTO m FROM pmap WHERE tablename = r.tablename AND policyname = r.policyname;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'NEZNÁMA politika s vetvou agency_id IS NULL: %.% — nie je v mape; skript sa zastavil, nič sa nezmenilo',
        r.tablename, r.policyname;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = m.chk_tab AND column_name = 'agency_id') THEN
      EXECUTE format('select count(*) from public.%I where agency_id is null', m.chk_tab) INTO n;
      IF n > 0 THEN
        RAISE EXCEPTION 'ZASTAVENÉ: %.agency_id IS NULL má % riadkov; prepísanie politiky %.% by ich skrylo. Najprv rozhodnúť (priradiť vlastníka / ponechať len service role).',
          m.chk_tab, n, r.tablename, r.policyname;
      END IF;
    END IF;

    EXECUTE format('drop policy %I on public.%I', r.policyname, r.tablename);
    EXECUTE m.create_sql;
    done := done + 1;
    RAISE NOTICE 'PREPÍSANÁ: %.%', r.tablename, r.policyname;
  END LOOP;
  RAISE NOTICE 'Prepísaných politík: %', done;
END
$rw$;

-- ---------------------------------------------------------------------------
-- 5) rls_audit_snapshot(): volá ju výlučne service role (schema-governance-guard,
--    tests/rls, rls-schema-parity-audit-once.mjs — všetky so service-role kľúčom).
--    Repo migrácia robí REVOKE len z PUBLIC, explicitné granty anon/authenticated
--    (Supabase default) ostanú; tu ich zhodíme. Ak funkcia v PROD nie je, nič.
-- ---------------------------------------------------------------------------
DO $fn$
BEGIN
  IF to_regprocedure('public.rls_audit_snapshot()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_audit_snapshot() FROM PUBLIC, anon, authenticated;
    GRANT  EXECUTE ON FUNCTION public.rls_audit_snapshot() TO service_role;
  END IF;
END
$fn$;

-- ---------------------------------------------------------------------------
-- 6) Kontrola v tej istej transakcii. Chyba = ROLLBACK všetkého.
-- ---------------------------------------------------------------------------
DO $post$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public'
     AND (COALESCE(qual, '') || ' ' || COALESCE(with_check, '')) ~* 'agency_id\s+is\s+null';
  IF n <> 0 THEN RAISE EXCEPTION 'KONTROLA: stále % politík s vetvou agency_id IS NULL', n; END IF;

  IF to_regprocedure('public.rls_audit_snapshot()') IS NOT NULL
     AND (has_function_privilege('anon', to_regprocedure('public.rls_audit_snapshot()'), 'EXECUTE')
          OR has_function_privilege('authenticated', to_regprocedure('public.rls_audit_snapshot()'), 'EXECUTE')) THEN
    RAISE EXCEPTION 'KONTROLA: rls_audit_snapshot je stále spustiteľná pre anon/authenticated';
  END IF;

  IF NOT has_function_privilege('authenticated', to_regprocedure('public.profile_agencies_for_auth()'), 'EXECUTE') THEN
    RAISE EXCEPTION 'KONTROLA: authenticated stratil EXECUTE na profile_agencies_for_auth() (nikdy sa nemá zúžiť)';
  END IF;
END
$post$;

COMMIT;
