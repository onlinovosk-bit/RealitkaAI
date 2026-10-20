-- verify-before.sql — BALÍK C „rls-rest-close". IBA SELECT. Dôkaz „pred".
-- Očakávaný stav PRED apply: kontroly 10–29 majú ok = false (otvorené), 30–39 true (predpoklady).
WITH fn(sig) AS (VALUES
  ('public.match_leads(vector,double precision,integer)'),
  ('public.match_properties(vector,double precision,integer)'),
  ('public.rls_audit_snapshot()'),
  ('public.calculate_broker_metrics()'),
  ('public.trg_activities_platform_events()'),
  ('public.trg_leads_platform_events()'),
  ('public.ai_triage_feedback_set_agency()')),
chk AS (
  SELECT 10 AS ord, f.sig || ': anon/authenticated NEMAJU EXECUTE' AS kontrola, 'false/false' AS ocakavane,
         COALESCE(has_function_privilege('anon', to_regprocedure(f.sig), 'EXECUTE')::text || '/' ||
                  has_function_privilege('authenticated', to_regprocedure(f.sig), 'EXECUTE')::text, 'funkcia chyba') AS skutocne
  FROM fn f
  UNION ALL SELECT 20, 'activities: anon bez akehokolvek prava', 'false',
         has_table_privilege('anon','public.activities','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')::text
  UNION ALL SELECT 21, 'portal_listings: anon/authenticated bez zapisu', 'false/false',
         has_table_privilege('anon','public.portal_listings','INSERT,UPDATE,DELETE,TRUNCATE')::text || '/' ||
         has_table_privilege('authenticated','public.portal_listings','INSERT,UPDATE,DELETE,TRUNCATE')::text
  UNION ALL SELECT 22, 'listing_price_history: anon/authenticated bez zapisu', 'false/false',
         has_table_privilege('anon','public.listing_price_history','INSERT,UPDATE,DELETE,TRUNCATE')::text || '/' ||
         has_table_privilege('authenticated','public.listing_price_history','INSERT,UPDATE,DELETE,TRUNCATE')::text
  UNION ALL SELECT 23, 'activities: riadky s agency_id IS NULL a platnym leadom (backfill)', '0',
         (SELECT count(*)::text FROM public.activities a JOIN public.leads l ON l.id=a.lead_id WHERE a.agency_id IS NULL AND l.agency_id IS NOT NULL)
  UNION ALL SELECT 30, 'predpoklad: stlpec activities.id existuje', 'true',
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activities' AND column_name='id')::text
  UNION ALL SELECT 31, 'predpoklad: service_role ma EXECUTE na rls_audit_snapshot', 'true',
         has_function_privilege('service_role', to_regprocedure('public.rls_audit_snapshot()'), 'EXECUTE')::text
  UNION ALL SELECT 32, 'predpoklad: zaloha activities este neexistuje', 'false',
         (to_regclass('public._bak_rls_rest_activities') IS NOT NULL)::text
  UNION ALL SELECT 40, 'kontext: activities riadkov celkom / bez agency_id / sirotske (bez leadu)', 'info',
         (SELECT count(*) FROM public.activities)::text || ' / ' || (SELECT count(*) FROM public.activities WHERE agency_id IS NULL)::text || ' / ' ||
         (SELECT count(*) FROM public.activities a WHERE NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.id=a.lead_id))::text
)
SELECT ord, kontrola, ocakavane, skutocne, CASE WHEN ocakavane='info' THEN NULL ELSE (ocakavane = skutocne) END AS ok
FROM chk ORDER BY ord, kontrola;
