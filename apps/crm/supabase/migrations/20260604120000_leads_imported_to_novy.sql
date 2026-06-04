-- Jednorazová oprava: importované leady mali status 'imported' mimo OPEN_STATUSES cron triáže.
UPDATE public.leads
SET
  status = 'Nový',
  updated_at = COALESCE(updated_at, now())
WHERE status = 'imported';
