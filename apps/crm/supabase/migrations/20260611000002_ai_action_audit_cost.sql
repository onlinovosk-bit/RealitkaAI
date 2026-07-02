-- PR-3: LLM náklad + credits_spent pre maržový report

ALTER TABLE public.ai_action_audit
  ADD COLUMN IF NOT EXISTS cost_eur numeric(10, 4),
  ADD COLUMN IF NOT EXISTS credits_spent integer;

CREATE OR REPLACE VIEW public.ai_action_daily_agency AS
SELECT
  agency_id,
  date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day_utc,
  count(*)::integer AS action_count,
  coalesce(sum(credits_spent), 0)::integer AS credits_spent_total,
  coalesce(sum(cost_eur), 0)::numeric(12, 4) AS cost_eur_total
FROM public.ai_action_audit
WHERE agency_id IS NOT NULL
GROUP BY agency_id, date_trunc('day', created_at AT TIME ZONE 'UTC')::date;
