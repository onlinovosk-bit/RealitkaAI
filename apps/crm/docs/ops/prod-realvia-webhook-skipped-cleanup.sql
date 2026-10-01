-- Wave 2 A3 — Realvia webhook skipped rows (PROD: GO REQUIRED)
-- Purpose: document ~8 processed=false rows with no property match (delete/unknown payloads).
-- NEVER set processed=true without a matching property — use reconcile via source_id instead.
--
-- Run order:
--   1) SECTION 1 SELECT — verify rows in Supabase SQL editor (not PostgREST HEAD from local)
--   2) SECTION 2 optional — annotate skipped rows (does NOT mark processed)
--   3) Re-run reconcile: POST /api/cron/realvia-process?reconcile_processed=1 (with CRON_SECRET)

-- === SECTION 1: SELECT skipped webhook logs (processed=false, no property match expected) ===
SELECT
  rwl.id,
  rwl.received_at,
  rwl.payload_type,
  rwl.processed,
  rwl.processing_error,
  rwl.agency_id,
  rwl.payload_json -> 'advert' ->> 'source_id' AS advert_source_id,
  rwl.payload_json ->> 'action' AS payload_action
FROM public.realvia_webhook_logs rwl
WHERE rwl.processed = false
ORDER BY rwl.received_at DESC
LIMIT 20;

-- Count (should align with reconcile skipped ≈ 8 for Smolko agency after B1 reconcile)
SELECT COUNT(*) AS pending_webhook_logs
FROM public.realvia_webhook_logs
WHERE processed = false;

-- === SECTION 2: OPTIONAL annotate (PROD GO REQUIRED — run SELECT above first) ===
-- Sets processing_error for rows that are delete/unknown with no property — still processed=false.
-- Uncomment and run ONLY after SELECT review:

/*
UPDATE public.realvia_webhook_logs rwl
SET processing_error = COALESCE(
  NULLIF(TRIM(rwl.processing_error), ''),
  'skipped: no matching property for source_id (reconcile B1)'
)
WHERE rwl.processed = false
  AND rwl.payload_type IN ('delete', 'unknown')
  AND NOT EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.agency_id = rwl.agency_id
      AND p.source_system = 'realvia'
      AND p.source_id = COALESCE(
        rwl.payload_json -> 'advert' ->> 'source_id',
        rwl.payload_json ->> 'source_id'
      )
  );
*/

-- === SECTION 3: Verify after optional annotate ===
SELECT id, payload_type, processed, processing_error
FROM public.realvia_webhook_logs
WHERE processed = false
ORDER BY received_at DESC;
