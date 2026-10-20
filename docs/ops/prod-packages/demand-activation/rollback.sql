-- ============================================================================
-- NEAPLIKOVAŤ BEZ GO FOUNDERA.
-- rollback.sql — BALÍK A „demand-activation": zruší obe tabuľky.
--
-- Odomykacie slovo:  GO DEMAND-ROLLBACK
-- Kedy: len ak apply.sql prešiel a treba ho vrátiť (napr. P19 zlyhalo).
-- Poistka: ak ktorákoľvek tabuľka obsahuje riadky, skript SA ZASTAVÍ (riadky
-- nesú doslovné citáty z textov klientov = osobné údaje; zmazanie je
-- nevratné). Pri riadkoch najprv vyexportovať a rozhodnúť o zmazaní zvlášť.
-- Poradie: najprv demand_property_matches (FK na lead_demands), potom lead_demands.
-- Nič iné sa nemení (agencies, leads, properties, profile_agencies_for_auth ostávajú).
-- Ak tabuľky existovali PRED apply.sql (verify-before.sql, riadky 10–11 = true),
-- rollback.sql NESPÚŠŤAŤ: apply.sql ich nevytváral, len zosúladil politiky a granty.
-- ============================================================================
BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $guard$
DECLARE
  n bigint;
BEGIN
  IF to_regclass('public.demand_property_matches') IS NOT NULL THEN
    EXECUTE 'select count(*) from public.demand_property_matches' INTO n;
    IF n > 0 THEN RAISE EXCEPTION 'ZASTAVENE: demand_property_matches ma % riadkov; najprv export + rozhodnutie', n; END IF;
  END IF;
  IF to_regclass('public.lead_demands') IS NOT NULL THEN
    EXECUTE 'select count(*) from public.lead_demands' INTO n;
    IF n > 0 THEN RAISE EXCEPTION 'ZASTAVENE: lead_demands ma % riadkov; najprv export + rozhodnutie', n; END IF;
  END IF;
END
$guard$;

DROP TABLE IF EXISTS public.demand_property_matches;
DROP TABLE IF EXISTS public.lead_demands;

-- Kontrola: obe preč a tenantová izolácia ostala (RLS funkcia nedotknutá).
DO $post$
BEGIN
  IF to_regclass('public.lead_demands') IS NOT NULL OR to_regclass('public.demand_property_matches') IS NOT NULL THEN
    RAISE EXCEPTION 'KONTROLA: tabuľka stále existuje';
  END IF;
  IF to_regprocedure('public.profile_agencies_for_auth()') IS NULL THEN
    RAISE EXCEPTION 'KONTROLA: profile_agencies_for_auth() chýba (rollback ju nemal čeliť)';
  END IF;
END
$post$;

COMMIT;
