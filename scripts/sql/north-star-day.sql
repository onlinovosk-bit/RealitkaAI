-- north-star-day.sql
-- Balík: 2026-09-17-north-star-measurement-loop
-- Pravidlo: agent tento súbor počas slučky NEMENÍ. Iba spúšťa s parametrom :den.
-- Povolené: SELECT. Zakázané: INSERT/UPDATE/DELETE/DDL.
-- Amendment 2026-09-15 (founder GO): leads_new_real / leads_new_seed + config attribution
--   žije mimo SQL (docs/ops/config-changelog.md).
--
-- Parameter :den = kalendárny deň 'YYYY-MM-DD' (Europe/Bratislava).
-- Rozsah = [den 00:00, den+1 00:00) v danej zóne.

WITH bounds AS (
  SELECT
    ((:den)::date AT TIME ZONE 'Europe/Bratislava') AS t0,
    (((:den)::date + 1) AT TIME ZONE 'Europe/Bratislava') AS t1
),
signal_realvia AS (
  SELECT count(*)::int AS n
  FROM realvia_webhook_logs, bounds
  WHERE received_at >= bounds.t0 AND received_at < bounds.t1
),
signal_portal AS (
  SELECT count(*)::int AS n
  FROM leads, bounds
  WHERE created_at >= bounds.t0 AND created_at < bounds.t1
    AND coalesce(source, '') LIKE 'portal:%'
),
lead_new AS (
  SELECT count(*)::int AS n
  FROM leads, bounds
  WHERE created_at >= bounds.t0 AND created_at < bounds.t1
),
-- Real inbound = source prefix portal:* (see founder GO 2026-09-15 nalezy).
-- Seed / demo = everything else including null source. Do not fold seed into growth.
lead_new_real AS (
  SELECT count(*)::int AS n
  FROM leads, bounds
  WHERE created_at >= bounds.t0 AND created_at < bounds.t1
    AND source LIKE 'portal:%'
),
lead_new_seed AS (
  SELECT count(*)::int AS n
  FROM leads, bounds
  WHERE created_at >= bounds.t0 AND created_at < bounds.t1
    AND (source NOT LIKE 'portal:%' OR source IS NULL)
),
lead_total AS (
  SELECT count(*)::int AS n
  FROM leads, bounds
  WHERE created_at < bounds.t1
),
intent_new AS (
  SELECT count(*)::int AS n
  FROM buyer_intents, bounds
  WHERE created_at >= bounds.t0 AND created_at < bounds.t1
),
intent_total AS (
  SELECT count(*)::int AS n
  FROM buyer_intents, bounds
  WHERE created_at < bounds.t1
),
match_new AS (
  SELECT count(*)::int AS n
  FROM lead_property_matches, bounds
  WHERE created_at >= bounds.t0 AND created_at < bounds.t1
),
match_total AS (
  SELECT count(*)::int AS n
  FROM lead_property_matches, bounds
  WHERE created_at < bounds.t1
),
outreach AS (
  SELECT count(*)::int AS n
  FROM leads, bounds
  WHERE auto_response_sent_at >= bounds.t0 AND auto_response_sent_at < bounds.t1
),
response_acts AS (
  SELECT count(*)::int AS n
  FROM activities, bounds
  WHERE created_at >= bounds.t0 AND created_at < bounds.t1
),
viewings AS (
  SELECT count(*)::int AS n
  FROM activities, bounds
  WHERE created_at >= bounds.t0 AND created_at < bounds.t1
    AND (
      lower(coalesce(type, '')) LIKE '%view%'
      OR lower(coalesce(type, '')) LIKE '%obhliad%'
      OR lower(coalesce(title, '')) LIKE '%obhliad%'
      OR lower(coalesce(text, '')) LIKE '%obhliad%'
    )
),
closed_won AS (
  SELECT count(*)::int AS n
  FROM leads, bounds
  WHERE updated_at >= bounds.t0 AND updated_at < bounds.t1
    AND status IN ('Uzavretý', 'closed_won')
),
notif_created AS (
  SELECT count(*)::int AS n
  FROM routine_notifications, bounds
  WHERE created_at >= bounds.t0 AND created_at < bounds.t1
),
unread_eod AS (
  SELECT count(*)::int AS n
  FROM routine_notifications, bounds
  WHERE created_at < bounds.t1
    AND (read_at IS NULL OR read_at >= bounds.t1)
)
SELECT
  (:den)::text AS date,
  (SELECT n FROM signal_realvia) AS realvia_webhooks,
  (SELECT n FROM signal_portal) AS portal_leads,
  (SELECT n FROM lead_new) AS leads_new,
  (SELECT n FROM lead_new_real) AS leads_new_real,
  (SELECT n FROM lead_new_seed) AS leads_new_seed,
  (SELECT n FROM lead_total) AS leads_total,
  (SELECT n FROM intent_new) AS intents_new,
  (SELECT n FROM intent_total) AS intents_total,
  (SELECT n FROM match_new) AS matches_new,
  (SELECT n FROM match_total) AS matches_total,
  (SELECT n FROM outreach) AS auto_responses_sent,
  (SELECT n FROM response_acts) AS activities,
  (SELECT n FROM viewings) AS viewings,
  (SELECT n FROM closed_won) AS closed_won,
  (SELECT n FROM notif_created) AS notifications_created,
  (SELECT n FROM unread_eod) AS unread_at_eod;
