-- MARGIN-VIEW-01 — `ai_cost_daily` bez fikcie.
--
-- Pôvodná (nikdy neaplikovaná) migrácia 20260611000004 počítala
--   revenue_eur_retail = credits_spent * 0,86
--   margin_eur         = revenue_eur_retail - cost_eur
-- podľa kreditového cenníka, ktorý je archivovaný. Pri 199 EUR/kancelaria
-- bez kreditov je credits_spent vzdy NULL, takze by pohlad vykazoval
-- retail 0 EUR a marzu -cost_eur.
--
-- Tento pohlad nesie VYHRADNE to, co databaza naozaj vie: skutocny naklad
-- na AI akcie za den a agenturu. Trzba a marza sa pocitaju v TypeScripte
-- z computeMrrBreakdown(), ktory je jediny zdroj pravdy o cenniku —
-- duplikovat `isAgencyActive` a sadzby v SQL by znamenalo dve definicie,
-- ktore sa raz rozidu.
--
-- security_invoker = true: pohlad respektuje RLS politiku
-- `ai_action_audit_select_tenant`, takze authenticated pouzivatel vidi len
-- svoju agenturu. Service role (founder metriky) RLS obchadza ako doteraz.

DROP VIEW IF EXISTS public.ai_cost_daily;

CREATE VIEW public.ai_cost_daily
WITH (security_invoker = true) AS
SELECT
  agency_id,
  date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day_utc,
  count(*)::integer AS action_count,
  coalesce(sum(cost_eur), 0)::numeric(12, 4) AS cost_eur
FROM public.ai_action_audit
WHERE agency_id IS NOT NULL
GROUP BY agency_id, date_trunc('day', created_at AT TIME ZONE 'UTC')::date;
