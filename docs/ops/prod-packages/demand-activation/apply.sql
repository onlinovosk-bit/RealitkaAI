-- ============================================================================
-- NEAPLIKOVAŤ BEZ GO FOUNDERA.
--
-- BALÍK A „demand-activation": vytvorí public.lead_demands a
-- public.demand_property_matches (DEMAND-D1 + DEMAND-D4) v PROD.
--
-- Odomykacie slovo:   GO DEMAND-SCHEMA
-- Spúšťa:             founder (alebo agent až po tomto slove), jedno spustenie.
-- Predtým:            verify-before.sql  (výstup uložiť)
-- Potom:              verify-after.sql   (výstup uložiť) a P19 z README.md
-- Návrat:             rollback.sql (odmietne zmazať tabuľky s riadkami)
--
-- Stav PROD v čase písania tohto súboru: UNVERIFIED (autor nemal prístup do PROD).
--   Repo (docs/STATUS.md) tvrdí „tabuľky v PROD od 2026-10-02, 0 riadkov",
--   zadanie balíka tvrdí „chýbajú". Rozhodne verify-before.sql. Skript je
--   idempotentný (IF NOT EXISTS / DROP POLICY IF EXISTS), takže ak tabuľky
--   existujú, nič nerozbije, len zosúladí politiky a granty s repom.
--
-- Obsah medzi značkami „BEGIN/END migrácia" je doslovná kópia súborov
--   apps/crm/supabase/migrations/20260929120000_lead_demands.sql
--   apps/crm/supabase/migrations/20260930120000_demand_property_matches.sql
-- Nič sa nezapína: DEMAND_EXTRACTION_ENABLED a DEMAND_MATCHING_ENABLED ostávajú
-- VYPNUTÉ (premenné prostredia, nie SQL). Tento skript ich nemení.
-- ============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Predpoklady: ak niečo nesedí, celá transakcia sa vráti späť a nič sa nezmení.
DO $pre$
DECLARE
  v text;
BEGIN
  IF to_regclass('public.agencies')   IS NULL THEN RAISE EXCEPTION 'PREDPOKLAD: public.agencies neexistuje'; END IF;
  IF to_regclass('public.leads')      IS NULL THEN RAISE EXCEPTION 'PREDPOKLAD: public.leads neexistuje'; END IF;
  IF to_regclass('public.properties') IS NULL THEN RAISE EXCEPTION 'PREDPOKLAD: public.properties neexistuje'; END IF;
  IF to_regprocedure('public.profile_agencies_for_auth()') IS NULL THEN
    RAISE EXCEPTION 'PREDPOKLAD: funkcia public.profile_agencies_for_auth() neexistuje (politika by sa nedala vytvoriť)';
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod) INTO v FROM pg_attribute a
   WHERE a.attrelid = 'public.agencies'::regclass AND a.attname = 'id' AND NOT a.attisdropped;
  IF v IS DISTINCT FROM 'uuid' THEN RAISE EXCEPTION 'PREDPOKLAD: agencies.id je %, očakávané uuid', v; END IF;

  SELECT format_type(a.atttypid, a.atttypmod) INTO v FROM pg_attribute a
   WHERE a.attrelid = 'public.leads'::regclass AND a.attname = 'id' AND NOT a.attisdropped;
  IF v IS DISTINCT FROM 'text' THEN RAISE EXCEPTION 'PREDPOKLAD: leads.id je %, očakávané text', v; END IF;

  SELECT format_type(a.atttypid, a.atttypmod) INTO v FROM pg_attribute a
   WHERE a.attrelid = 'public.properties'::regclass AND a.attname = 'id' AND NOT a.attisdropped;
  IF v IS DISTINCT FROM 'text' THEN RAISE EXCEPTION 'PREDPOKLAD: properties.id je %, očakávané text', v; END IF;
END
$pre$;

-- ===================== BEGIN migrácia 20260929120000_lead_demands.sql =====================
-- DEMAND-D1: lead_demands — Demand Contract v1 records (docs/reports/2026-09-29-demand-os-gap-audit.md).
--
-- One row per extraction attempt, append-only; the newest row per lead is the
-- current demand. `demand` holds every contract field as
-- {value, confidence, source, evidence} with explicit nulls for unknowns.
--
-- Tenant boundary
-- ===============
-- agency_id is NOT NULL from day one, so the `agency_id IS NULL OR …` escape
-- closed by 20260928070000_rls_null_escapes cannot exist here. Writers are the
-- service role only (ingestion and the backfill); `authenticated` may read its
-- own agency's rows and nothing else — no INSERT/UPDATE/DELETE policy exists.

CREATE TABLE IF NOT EXISTS public.lead_demands (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id        uuid        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id          text        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  contract_version text        NOT NULL DEFAULT 'v1',
  status           text        NOT NULL
                   CHECK (status IN ('ok', 'no_text', 'llm_error', 'invalid_output', 'disabled')),
  demand           jsonb       NOT NULL,
  known_fields     smallint    NOT NULL DEFAULT 0 CHECK (known_fields >= 0),
  core_complete    boolean     NOT NULL DEFAULT false,
  extractor        text        NOT NULL,
  input_chars      integer     NOT NULL DEFAULT 0,
  extracted_at     timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_demands_lead_latest_idx
  ON public.lead_demands (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_demands_agency_created_idx
  ON public.lead_demands (agency_id, created_at DESC);

ALTER TABLE public.lead_demands ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.lead_demands FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.lead_demands FROM authenticated;
GRANT SELECT ON public.lead_demands TO authenticated;

DROP POLICY IF EXISTS lead_demands_select_tenant ON public.lead_demands;
CREATE POLICY lead_demands_select_tenant ON public.lead_demands
  FOR SELECT TO authenticated
  USING (agency_id IN (SELECT public.profile_agencies_for_auth()));

COMMENT ON TABLE public.lead_demands IS
  'Demand Contract v1 — append-only extraction records. Values only with verbatim evidence (AP-001). Service-role writes; tenant read via profile_agencies_for_auth().';

-- ===================== END migrácia 20260929120000_lead_demands.sql =====================

-- ===================== BEGIN migrácia 20260930120000_demand_property_matches.sql =====================
-- DEMAND-D4: demand_property_matches — matches computed ONLY from verified demand.
-- Spec: docs/architecture/matching-input-contract-v1.md.
--
-- A separate table, not lead_property_matches: that one is filled by the old
-- engine, which reads leads.property_type/rooms/financing/timeline — columns
-- pre-filled with defaults on four code paths. Mixing the two would make a
-- guessed match indistinguishable from a verified one.
--
-- demand_record_id is NOT NULL and cascades: a match cannot exist without the
-- demand record (and its evidence) it was computed from (contract §5).
-- Tenant boundary as lead_demands: agency_id NOT NULL, service-role writes,
-- authenticated reads its own agency only.

CREATE TABLE IF NOT EXISTS public.demand_property_matches (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id        uuid        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id          text        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  demand_record_id uuid        NOT NULL REFERENCES public.lead_demands(id) ON DELETE CASCADE,
  property_id      text        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  score            numeric(4,3) NOT NULL CHECK (score >= 0 AND score <= 1),
  fields           jsonb       NOT NULL,
  engine           text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (demand_record_id, property_id)
);

CREATE INDEX IF NOT EXISTS demand_property_matches_lead_idx
  ON public.demand_property_matches (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS demand_property_matches_agency_idx
  ON public.demand_property_matches (agency_id, created_at DESC);

ALTER TABLE public.demand_property_matches ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.demand_property_matches FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.demand_property_matches FROM authenticated;
GRANT SELECT ON public.demand_property_matches TO authenticated;

DROP POLICY IF EXISTS demand_property_matches_select_tenant ON public.demand_property_matches;
CREATE POLICY demand_property_matches_select_tenant ON public.demand_property_matches
  FOR SELECT TO authenticated
  USING (agency_id IN (SELECT public.profile_agencies_for_auth()));

COMMENT ON TABLE public.demand_property_matches IS
  'DEMAND-D4 matches from verified lead_demands only (no leads.* defaults, no fallback values). Service-role writes; tenant read.';

-- ===================== END migrácia 20260930120000_demand_property_matches.sql =====================

-- Odchýlka od repo migrácií (jediná): explicitný GRANT pre service_role.
-- Repo to rieši plošne v 20260613000002_service_role_table_grants.sql
-- (ALTER DEFAULT PRIVILEGES); či je to tak aj v PROD, je UNVERIFIED, preto tu
-- explicitne. service_role obchádza RLS, ale potrebuje tabuľkové právo.
GRANT ALL ON public.lead_demands            TO service_role;
GRANT ALL ON public.demand_property_matches TO service_role;

-- Kontrola po aplikácii v tej istej transakcii. Chyba = ROLLBACK celého balíka.
DO $post$
DECLARE
  t text;
  n int;
BEGIN
  FOREACH t IN ARRAY ARRAY['lead_demands', 'demand_property_matches'] LOOP
    IF NOT (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid = ('public.' || t)::regclass) THEN
      RAISE EXCEPTION 'KONTROLA: RLS nie je zapnutá na %', t;
    END IF;
    SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'public' AND tablename = t;
    IF n <> 1 THEN RAISE EXCEPTION 'KONTROLA: % má % politík, očakávaná 1', t, n; END IF;
    IF has_table_privilege('anon', 'public.' || t, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
      RAISE EXCEPTION 'KONTROLA: anon má právo na %', t;
    END IF;
    IF has_table_privilege('authenticated', 'public.' || t, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
      RAISE EXCEPTION 'KONTROLA: authenticated má zápisové právo na %', t;
    END IF;
    IF NOT has_table_privilege('authenticated', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION 'KONTROLA: authenticated nemá SELECT na %', t;
    END IF;
  END LOOP;
END
$post$;

-- PostgREST má schému v cache; Supabase ju po DDL zvyčajne obnoví sám, toto je poistka
-- (doručí sa až po COMMIT, bez vedľajších účinkov).
NOTIFY pgrst, 'reload schema';

COMMIT;
