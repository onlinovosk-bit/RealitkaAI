BEGIN;

-- Supabase .upsert(onConflict) requires a UNIQUE CONSTRAINT, not a partial index.
-- Without this, storeUcImportLog upsert fails with 42P10 while plain INSERT works (AP-010).
DROP INDEX IF EXISTS public.uq_realsoft_import_logs_dedupe;

ALTER TABLE public.realsoft_import_logs
  DROP CONSTRAINT IF EXISTS uq_realsoft_import_logs_dedupe;

ALTER TABLE public.realsoft_import_logs
  ADD CONSTRAINT uq_realsoft_import_logs_dedupe
  UNIQUE (agency_id, action, external_id);

COMMIT;
