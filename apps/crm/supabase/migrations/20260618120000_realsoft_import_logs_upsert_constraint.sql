BEGIN;

-- Supabase .upsert(onConflict) requires a UNIQUE CONSTRAINT, not a partial index.
-- Without this, storeUcImportLog upsert fails with 42P10 while plain INSERT works (AP-010).
-- Poradie je zavazne: po prvom behu je uq_realsoft_import_logs_dedupe index
-- VLASTNENY constraintom a DROP INDEX na nom zlyha (2BP01). Zhod najprv
-- constraint — index zmizne s nim a DROP INDEX nizsie je uz len no-op pre
-- pripad, ze na instancii este existuje povodny partialny index.
ALTER TABLE public.realsoft_import_logs
  DROP CONSTRAINT IF EXISTS uq_realsoft_import_logs_dedupe;

DROP INDEX IF EXISTS public.uq_realsoft_import_logs_dedupe;

ALTER TABLE public.realsoft_import_logs
  ADD CONSTRAINT uq_realsoft_import_logs_dedupe
  UNIQUE (agency_id, action, external_id);

COMMIT;
