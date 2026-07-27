-- Guardian v1.1 — remove open STALE findings invalid under 90d+7d rule (lead_events required).
-- READ-ONLY first: run the SELECT blocks; DELETE only after founder GO post-merge.
--
-- Invalid STALE (v1.1): open STALE where latest lead_events.created_at is NULL,
-- OR latest event is within 7 days, OR latest event is older than 90 days.

-- Count open findings by rule (baseline)
SELECT rule_code, COUNT(*) AS open_count
FROM guardian_findings
WHERE resolved_at IS NULL
GROUP BY rule_code
ORDER BY rule_code;

-- Count open STALE rows that v1.1 would not create
WITH latest_event AS (
  SELECT
    gf.id AS finding_id,
    gf.agency_id,
    gf.lead_id,
    MAX(le.created_at) AS last_event_at
  FROM guardian_findings gf
  LEFT JOIN lead_events le
    ON le.lead_id = gf.lead_id
   AND le.agency_id = gf.agency_id
  WHERE gf.resolved_at IS NULL
    AND gf.rule_code = 'STALE'
  GROUP BY gf.id, gf.agency_id, gf.lead_id
)
SELECT
  COUNT(*) FILTER (WHERE last_event_at IS NULL) AS invalid_no_events,
  COUNT(*) FILTER (
    WHERE last_event_at IS NOT NULL
      AND last_event_at >= NOW() - INTERVAL '7 days'
  ) AS invalid_active_within_7d,
  COUNT(*) FILTER (
    WHERE last_event_at IS NOT NULL
      AND last_event_at < NOW() - INTERVAL '90 days'
  ) AS invalid_older_than_90d,
  COUNT(*) FILTER (
    WHERE last_event_at IS NOT NULL
      AND last_event_at < NOW() - INTERVAL '7 days'
      AND last_event_at >= NOW() - INTERVAL '90 days'
  ) AS valid_v11_stale
FROM latest_event;

-- Founder-only DELETE (do not run from CI/automation):
-- DELETE FROM guardian_findings gf
-- USING (
--   SELECT
--     gf2.id,
--     MAX(le.created_at) AS last_event_at
--   FROM guardian_findings gf2
--   LEFT JOIN lead_events le
--     ON le.lead_id = gf2.lead_id
--    AND le.agency_id = gf2.agency_id
--   WHERE gf2.resolved_at IS NULL
--     AND gf2.rule_code = 'STALE'
--   GROUP BY gf2.id
-- ) AS x
-- WHERE gf.id = x.id
--   AND (
--     x.last_event_at IS NULL
--     OR x.last_event_at >= NOW() - INTERVAL '7 days'
--     OR x.last_event_at < NOW() - INTERVAL '90 days'
--   );
