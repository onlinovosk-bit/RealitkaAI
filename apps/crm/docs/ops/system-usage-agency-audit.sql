-- Wave 3A audit: system vs customer records under Smolko agency_id
-- Run read-only on prod before/after env deploy. Attach output to PR #342.
-- Smolko tenant (paying customer):
--   11111111-1111-1111-1111-111111111111
-- New system tenant (platform cron / heartbeats):
--   00000000-0000-0000-0000-000000000001

-- 1) Daily usage metrics attributed to Smolko (historical system bleed)
SELECT metric, SUM(amount) AS total, MIN(metric_day) AS first_day, MAX(metric_day) AS last_day
FROM public.usage_metrics_daily
WHERE agency_id = '11111111-1111-1111-1111-111111111111'::uuid
GROUP BY metric
ORDER BY total DESC;

-- 2) Guardian / platform routine_notifications under Smolko (system notification types)
SELECT type, COUNT(*) AS cnt, MIN(created_at) AS first_at, MAX(created_at) AS last_at
FROM public.routine_notifications
WHERE agency_id = '11111111-1111-1111-1111-111111111111'::uuid
  AND type IN ('guardian_runner', 'ceo_command')
GROUP BY type
ORDER BY cnt DESC;

-- 3) Smolko customer routine_notifications (tenant-scoped, for contrast)
SELECT type, COUNT(*) AS cnt
FROM public.routine_notifications
WHERE agency_id = '11111111-1111-1111-1111-111111111111'::uuid
  AND type NOT IN ('guardian_platform_run', 'ceo_command')
GROUP BY type
ORDER BY cnt DESC;

-- 4) Summary: rows that should move to system agency after backfill (founder-only UPDATE)
SELECT 'usage_metrics_daily' AS source, COUNT(*) AS rows_under_smolko
FROM public.usage_metrics_daily
WHERE agency_id = '11111111-1111-1111-1111-111111111111'::uuid
UNION ALL
SELECT 'routine_notifications_system_types', COUNT(*)
FROM public.routine_notifications
WHERE agency_id = '11111111-1111-1111-1111-111111111111'::uuid
  AND type IN ('guardian_runner', 'ceo_command');

-- 5) Verify system agency row exists after migration apply
SELECT id, name, slug, is_active
FROM public.agencies
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
