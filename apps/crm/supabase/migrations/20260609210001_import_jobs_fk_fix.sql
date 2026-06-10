-- Fix: import_jobs.created_by ON DELETE SET NULL
-- Dôvod: DELETE FROM profiles failoval s FK violation

ALTER TABLE import_jobs
  DROP CONSTRAINT IF EXISTS import_jobs_created_by_fkey;

ALTER TABLE import_jobs
  ADD CONSTRAINT import_jobs_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES profiles(id)
  ON DELETE SET NULL;

COMMENT ON CONSTRAINT import_jobs_created_by_fkey ON import_jobs IS
  'Changed from RESTRICT to SET NULL — allows profile cleanup without cascade delete of import history.';
