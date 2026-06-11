-- PR-3 gap: model + latency_ms + denný maržový agregát (retail 0,86 €/kredit)

ALTER TABLE public.ai_action_audit
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS latency_ms integer;

CREATE OR REPLACE VIEW public.ai_cost_daily AS
SELECT
  agency_id,
  date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day_utc,
  coalesce(sum(credits_spent), 0)::integer AS credits_spent,
  coalesce(sum(cost_eur), 0)::numeric(12, 4) AS cost_eur,
  (coalesce(sum(credits_spent), 0) * 0.86)::numeric(12, 4) AS revenue_eur_retail,
  (
    (coalesce(sum(credits_spent), 0) * 0.86) - coalesce(sum(cost_eur), 0)
  )::numeric(12, 4) AS margin_eur
FROM public.ai_action_audit
WHERE agency_id IS NOT NULL
GROUP BY agency_id, date_trunc('day', created_at AT TIME ZONE 'UTC')::date;
