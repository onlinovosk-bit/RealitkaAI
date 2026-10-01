BEGIN;

-- UC / RealSoft agent dedupe (action=2)
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS import_source_id TEXT,
  ADD COLUMN IF NOT EXISTS import_source_system TEXT,
  ADD COLUMN IF NOT EXISTS import_image_url TEXT,
  ADD COLUMN IF NOT EXISTS import_image_changed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS import_meta JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_uc_import_source
  ON public.profiles (agency_id, import_source_system, import_source_id)
  WHERE import_source_id IS NOT NULL AND import_source_system IS NOT NULL;

COMMENT ON COLUMN public.profiles.import_source_id IS
  'Stable external id from UC/RealSoft export (user_id).';
COMMENT ON COLUMN public.profiles.import_source_system IS
  'Import source system for external agent id (e.g. uc).';

-- Properties import columns (from Realvia infra; required before tenant source index)
ALTER TABLE IF EXISTS public.properties
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS source_system TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS broker_source_id TEXT,
  ADD COLUMN IF NOT EXISTS broker_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS broker_email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS broker_phone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payload_raw JSONB,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS usable_area NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS land_area NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS building_area NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS transaction_type TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS floor SMALLINT,
  ADD COLUMN IF NOT EXISTS rooms_count SMALLINT,
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Import audit: store UC result code (1=added, 2=edited, 3=deleted, ...)
ALTER TABLE IF EXISTS public.realsoft_import_logs
  ADD COLUMN IF NOT EXISTS result_code SMALLINT;

-- Allow uc in universal import jobs
ALTER TABLE IF EXISTS public.import_jobs DROP CONSTRAINT IF EXISTS import_jobs_source_check;

ALTER TABLE IF EXISTS public.import_jobs
  ADD CONSTRAINT import_jobs_source_check CHECK (
    source_system IN (
      'realvia', 'realvia-json', 'realsoft', 'uc', 'nehnutelnosti_sk', 'google_contacts',
      'vcf', 'outlook_csv', 'flowii', 'generic_csv', 'xlsx'
    )
  );

COMMENT ON CONSTRAINT import_jobs_source_check ON public.import_jobs IS
  'uc = United Classifieds / Nehnuteľnosti export API (same protocol as realsoft)';

-- Tenant-scoped idempotent upsert for imported listings (UC object_id is per agency/RK)
DROP INDEX IF EXISTS public.idx_properties_source_id_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_tenant_source_unique
  ON public.properties (agency_id, source_system, source_id)
  WHERE source_id IS NOT NULL AND agency_id IS NOT NULL;

COMMIT;
