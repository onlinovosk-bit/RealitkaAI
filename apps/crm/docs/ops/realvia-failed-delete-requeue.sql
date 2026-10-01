-- Re-queue failed Realvia delete jobs after string source_id fix deploy.
-- Run in Supabase SQL editor (service role). Review rows before COMMIT.

BEGIN;

-- Failed delete payloads (string source_id) — reset for worker retry
UPDATE public.realvia_processing_queue q
SET
  status = 'pending',
  retry_count = 0,
  error_message = NULL,
  next_retry_at = NULL,
  processed_at = NULL
FROM public.realvia_webhook_logs l
WHERE q.webhook_log_id = l.id
  AND q.status = 'failed'
  AND l.processing_error ILIKE '%Unknown payload%'
  AND l.payload_json->>'action' = 'delete';

UPDATE public.realvia_webhook_logs l
SET processed = FALSE, processing_error = NULL
WHERE l.processing_error ILIKE '%Unknown payload%'
  AND l.payload_json->>'action' = 'delete';

-- Optional: inspect before commit
-- SELECT l.id, l.payload_json->>'source_id', q.status, q.error_message
-- FROM realvia_webhook_logs l
-- JOIN realvia_processing_queue q ON q.webhook_log_id = l.id
-- WHERE l.payload_json->>'action' = 'delete';

COMMIT;
