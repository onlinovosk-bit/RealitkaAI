-- Allow realvia-json as universal import source (JSON migration export)
ALTER TABLE import_jobs DROP CONSTRAINT IF EXISTS import_jobs_source_check;

ALTER TABLE import_jobs
  ADD CONSTRAINT import_jobs_source_check CHECK (
    source_system IN (
      'realvia', 'realvia-json', 'realsoft', 'nehnutelnosti_sk', 'google_contacts',
      'vcf', 'outlook_csv', 'flowii', 'generic_csv', 'xlsx'
    )
  );

COMMENT ON CONSTRAINT import_jobs_source_check ON import_jobs IS
  'realvia-json = structured JSON export from Realvia migration API';
