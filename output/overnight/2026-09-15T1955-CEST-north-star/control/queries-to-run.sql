-- queries-to-run.sql  (founder_batch režim)
-- Balík: 2026-09-17-north-star-measurement-loop
-- Spusti RAZ v Supabase SQL editori (read-only / SELECT).
-- Výstup ulož ako control/results.json (pole "rows": [ {...}, ... ]).
--
-- Jedna dávka = 31 dní: 2026-08-17 .. 2026-09-16.
-- Logika zodpovedá scripts/sql/north-star-day.sql (bez :den — dátumy sú v generate_series).

WITH days AS (
  SELECT d::date AS den
  FROM generate_series(DATE '2026-08-17', DATE '2026-09-16', INTERVAL '1 day') AS g(d)
),
bounds AS (
  SELECT
    den,
    (den AT TIME ZONE 'Europe/Bratislava') AS t0,
    ((den + 1) AT TIME ZONE 'Europe/Bratislava') AS t1
  FROM days
)
SELECT
  b.den::text AS date,
  (SELECT count(*)::int FROM realvia_webhook_logs w
    WHERE w.received_at >= b.t0 AND w.received_at < b.t1) AS realvia_webhooks,
  (SELECT count(*)::int FROM leads l
    WHERE l.created_at >= b.t0 AND l.created_at < b.t1
      AND coalesce(l.source, '') LIKE 'portal:%') AS portal_leads,
  (SELECT count(*)::int FROM leads l
    WHERE l.created_at >= b.t0 AND l.created_at < b.t1) AS leads_new,
  (SELECT count(*)::int FROM leads l
    WHERE l.created_at < b.t1) AS leads_total,
  (SELECT count(*)::int FROM buyer_intents i
    WHERE i.created_at >= b.t0 AND i.created_at < b.t1) AS intents_new,
  (SELECT count(*)::int FROM buyer_intents i
    WHERE i.created_at < b.t1) AS intents_total,
  (SELECT count(*)::int FROM lead_property_matches m
    WHERE m.created_at >= b.t0 AND m.created_at < b.t1) AS matches_new,
  (SELECT count(*)::int FROM lead_property_matches m
    WHERE m.created_at < b.t1) AS matches_total,
  (SELECT count(*)::int FROM leads l
    WHERE l.auto_response_sent_at >= b.t0 AND l.auto_response_sent_at < b.t1) AS auto_responses_sent,
  (SELECT count(*)::int FROM activities a
    WHERE a.created_at >= b.t0 AND a.created_at < b.t1) AS activities,
  (SELECT count(*)::int FROM activities a
    WHERE a.created_at >= b.t0 AND a.created_at < b.t1
      AND (
        lower(coalesce(a.type, '')) LIKE '%view%'
        OR lower(coalesce(a.type, '')) LIKE '%obhliad%'
        OR lower(coalesce(a.title, '')) LIKE '%obhliad%'
        OR lower(coalesce(a.text, '')) LIKE '%obhliad%'
      )) AS viewings,
  (SELECT count(*)::int FROM leads l
    WHERE l.updated_at >= b.t0 AND l.updated_at < b.t1
      AND l.status IN ('Uzavretý', 'closed_won')) AS closed_won,
  (SELECT count(*)::int FROM routine_notifications n
    WHERE n.created_at >= b.t0 AND n.created_at < b.t1) AS notifications_created,
  (SELECT count(*)::int FROM routine_notifications n
    WHERE n.created_at < b.t1
      AND (n.read_at IS NULL OR n.read_at >= b.t1)) AS unread_at_eod
FROM bounds b
ORDER BY b.den;
