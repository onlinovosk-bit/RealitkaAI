-- verify-after.sql — BALÍK C. IBA SELECT. Očakávanie: všetky `ok` = true (riadok 40 je info).
-- Je to ten istý skript ako verify-before.sql, len s očakávanými hodnotami po apply.
WITH fn(sig) AS (VALUES
  ('public.match_leads(vector,double precision,integer)'),('public.match_properties(vector,double precision,integer)'),
  ('public.rls_audit_snapshot()'),('public.calculate_broker_metrics()'),('public.trg_activities_platform_events()'),
  ('public.trg_leads_platform_events()'),('public.ai_triage_feedback_set_agency()')),
chk AS (
  SELECT 10 AS ord, f.sig || ': anon/authenticated NEMAJU EXECUTE' AS kontrola, 'false/false' AS ocakavane,
         COALESCE(has_function_privilege('anon', to_regprocedure(f.sig), 'EXECUTE')::text || '/' ||
                  has_function_privilege('authenticated', to_regprocedure(f.sig), 'EXECUTE')::text, 'funkcia chyba') AS skutocne FROM fn f
  UNION ALL SELECT 11, 'service_role ma EXECUTE na match_leads / match_properties / rls_audit_snapshot', 'true/true/true',
         has_function_privilege('service_role', to_regprocedure('public.match_leads(vector,double precision,integer)'),'EXECUTE')::text || '/' ||
         has_function_privilege('service_role', to_regprocedure('public.match_properties(vector,double precision,integer)'),'EXECUTE')::text || '/' ||
         has_function_privilege('service_role', to_regprocedure('public.rls_audit_snapshot()'),'EXECUTE')::text
  UNION ALL SELECT 20, 'activities: anon bez akehokolvek prava', 'false',
         has_table_privilege('anon','public.activities','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')::text
  UNION ALL SELECT 21, 'portal_listings: anon/authenticated bez zapisu', 'false/false',
         has_table_privilege('anon','public.portal_listings','INSERT,UPDATE,DELETE,TRUNCATE')::text || '/' || has_table_privilege('authenticated','public.portal_listings','INSERT,UPDATE,DELETE,TRUNCATE')::text
  UNION ALL SELECT 22, 'listing_price_history: anon/authenticated bez zapisu', 'false/false',
         has_table_privilege('anon','public.listing_price_history','INSERT,UPDATE,DELETE,TRUNCATE')::text || '/' || has_table_privilege('authenticated','public.listing_price_history','INSERT,UPDATE,DELETE,TRUNCATE')::text
  UNION ALL SELECT 23, 'activities: prirad. riadky s agency_id IS NULL', '0',
         (SELECT count(*)::text FROM public.activities a JOIN public.leads l ON l.id=a.lead_id WHERE a.agency_id IS NULL AND l.agency_id IS NOT NULL)
  UNION ALL SELECT 24, 'activities: pocet riadkov sa nezmenil vs zaloha-rozsah (zaloha <= riadkov s agency_id)', 'true',
         ((SELECT count(*) FROM public._bak_rls_rest_activities) <= (SELECT count(*) FROM public.activities WHERE agency_id IS NOT NULL))::text
  UNION ALL SELECT 25, 'zaloha: tabulka s RLS a bez grantov pre anon/authenticated', 'true/false',
         (SELECT relrowsecurity::text FROM pg_class WHERE oid = to_regclass('public._bak_rls_rest_activities')) || '/' ||
         has_table_privilege('authenticated','public._bak_rls_rest_activities','SELECT')::text
  UNION ALL SELECT 30, 'regresia: profile_agencies_for_auth() ostava volatelna pre authenticated', 'true',
         has_function_privilege('authenticated', to_regprocedure('public.profile_agencies_for_auth()'),'EXECUTE')::text
  UNION ALL SELECT 31, 'regresia: authenticated si ponecha SELECT na activities', 'true',
         has_table_privilege('authenticated','public.activities','SELECT')::text
  UNION ALL SELECT 32, 'regresia: live RPC (add_price_point, compute_bri_score_v2, record_brief_open) stale volatelne', 'true',
         (has_function_privilege('authenticated', to_regprocedure('public.add_price_point(uuid,numeric,text,uuid,text,text,text)'),'EXECUTE')
          AND has_function_privilege('authenticated', to_regprocedure('public.compute_bri_score_v2(text,uuid,text)'),'EXECUTE')
          AND has_function_privilege('anon', to_regprocedure('public.record_brief_open(uuid)'),'EXECUTE'))::text
  UNION ALL SELECT 40, 'kontext: activities riadkov celkom / bez agency_id / sirotske', 'info',
         (SELECT count(*) FROM public.activities)::text || ' / ' || (SELECT count(*) FROM public.activities WHERE agency_id IS NULL)::text || ' / ' ||
         (SELECT count(*) FROM public.activities a WHERE NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.id=a.lead_id))::text
)
SELECT ord, kontrola, ocakavane, skutocne, CASE WHEN ocakavane='info' THEN NULL ELSE (ocakavane = skutocne) END AS ok FROM chk ORDER BY ord, kontrola;
