-- ============================================================
-- Universal CRM Import — Supabase migrácia
-- Verzia: 1.0.0 | jún 2026
-- Súbor: supabase/migrations/20260608120000_universal_crm_import.sql
-- ============================================================

-- ── 1. IMPORT JOBS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_jobs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id         UUID        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  created_by        UUID        REFERENCES profiles(id),

  -- Zdroj
  source_system     TEXT        NOT NULL,
  -- 'realvia' | 'realsoft' | 'nehnutelnosti_sk' | 'google_contacts'
  -- | 'vcf' | 'outlook_csv' | 'flowii' | 'generic_csv' | 'xlsx'
  source_version    TEXT,       -- napr. "Realvia 3.1"
  file_name         TEXT        NOT NULL,
  file_size_bytes   BIGINT,
  file_hash         TEXT,       -- SHA256 — detekcia duplikátov

  -- Stav
  status            TEXT        NOT NULL DEFAULT 'pending',
  -- 'pending' | 'detecting' | 'mapping' | 'preview' | 'importing' | 'done' | 'failed'

  -- Výsledky
  total_rows        INT         DEFAULT 0,
  imported_rows     INT         DEFAULT 0,
  skipped_rows      INT         DEFAULT 0,
  duplicate_rows    INT         DEFAULT 0,
  error_rows        INT         DEFAULT 0,

  -- Mapovanie stĺpcov
  detected_columns  JSONB,
  -- { "Meno": { "target": "contact_name", "confidence": 0.95, "source": "auto" } }
  column_mapping    JSONB,
  -- { "Meno": "contact_name", "Mobil": "phone" } — finálne po potvrdení
  mapping_source    TEXT        DEFAULT 'auto',
  -- 'auto' | 'manual' | 'learned' (z Migration Intelligence)

  -- Chyby
  error_log         JSONB,      -- [{ row: 5, reason: "missing phone" }]
  fatal_error       TEXT,       -- ak celý job zlyhal

  -- Časy
  started_at        TIMESTAMPTZ DEFAULT now(),
  mapping_at        TIMESTAMPTZ,
  preview_at        TIMESTAMPTZ,
  importing_at      TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,

  -- KPI
  time_to_complete  INTERVAL GENERATED ALWAYS AS (completed_at - started_at) STORED,

  CONSTRAINT import_jobs_status_check CHECK (
    status IN ('pending','detecting','mapping','preview','importing','done','failed')
  ),
  CONSTRAINT import_jobs_source_check CHECK (
    source_system IN (
      'realvia','realsoft','nehnutelnosti_sk','google_contacts',
      'vcf','outlook_csv','flowii','generic_csv','xlsx'
    )
  )
);

-- ── 2. IMPORT ROWS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_rows (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID    NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  agency_id     UUID    NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  row_number    INT     NOT NULL,
  raw_data      JSONB   NOT NULL,   -- pôvodné dáta z CSV/XLSX
  mapped_data   JSONB,              -- po column_mapping

  status        TEXT    NOT NULL DEFAULT 'pending',
  -- 'pending' | 'imported' | 'skipped' | 'duplicate' | 'error'
  skip_reason   TEXT,
  -- 'missing_name' | 'missing_contact' | 'duplicate_phone'
  -- | 'duplicate_email' | 'invalid_format'

  lead_id       TEXT    REFERENCES public.leads(id),  -- vyplní sa po úspešnom importe

  CONSTRAINT import_rows_status_check CHECK (
    status IN ('pending','imported','skipped','duplicate','error')
  )
);

-- ── 3. MIGRATION INTELLIGENCE ───────────────────────────────
CREATE TABLE IF NOT EXISTS migration_cases (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id               UUID        REFERENCES agencies(id),
  agency_name             TEXT        NOT NULL,

  -- Zdrojový systém
  source_crm              TEXT        NOT NULL,
  source_crm_version      TEXT,
  export_available        BOOLEAN,
  export_types            TEXT[],     -- ['csv', 'xlsx', 'api', 'none']
  days_to_get_export      INT,        -- 0 = ihneď, NULL = nedodaný

  -- Kvalita dát
  total_contacts_exported INT,
  total_contacts_imported INT,
  data_quality_score      INT CHECK (data_quality_score BETWEEN 0 AND 100),
  -- % kontaktov s menom + telefónom alebo emailom
  duplicate_rate          DECIMAL(5,2),
  -- % duplikátov v zdrojovom exporte

  -- Prúbeh migrácie
  migration_attempts      INT         DEFAULT 1,
  migrated_by             TEXT,
  -- 'self_service' | 'assisted' | 'revolis_team'
  time_to_first_import    INTERVAL,   -- od prvého uploadu po úspešný import

  -- Blokery
  blocker_types           TEXT[],
  -- ['gdpr', 'technical', 'format', 'commercial', 'contractual']
  blocker_notes           TEXT,

  -- Biznis
  revenue_unlocked_eur    DECIMAL(10,2), -- mesačný plán zákazníka
  nps_after_migration     INT CHECK (nps_after_migration BETWEEN 0 AND 10),

  -- Learned column mappings pre tento CRM systém
  learned_mappings        JSONB,
  -- { "Meno a priezvisko": "contact_name", "Mobilný telefón": "phone" }
  -- Toto sa postupne obohacuje pri každej ďalšej migrácii z rovnakého CRM

  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- ── 4. INDEXY ───────────────────────────────────────────────
CREATE INDEX idx_import_jobs_agency     ON import_jobs(agency_id);
CREATE INDEX idx_import_jobs_status     ON import_jobs(status);
CREATE INDEX idx_import_jobs_source     ON import_jobs(source_system);
CREATE INDEX idx_import_jobs_created    ON import_jobs(started_at DESC);
CREATE INDEX idx_import_rows_job        ON import_rows(job_id);
CREATE INDEX idx_import_rows_agency     ON import_rows(agency_id);
CREATE INDEX idx_import_rows_lead       ON import_rows(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_migration_cases_crm    ON migration_cases(source_crm);
CREATE INDEX idx_migration_cases_agency ON migration_cases(agency_id);

-- ── 5. RLS ──────────────────────────────────────────────────
ALTER TABLE import_jobs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_rows       ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_cases   ENABLE ROW LEVEL SECURITY;

-- import_jobs: vidí len vlastná agentúra
CREATE POLICY "import_jobs_agency_isolation" ON import_jobs
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM profiles
      WHERE auth_user_id = auth.uid()
    )
  );

-- import_rows: vidí len vlastná agentúra
CREATE POLICY "import_rows_agency_isolation" ON import_rows
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM profiles
      WHERE auth_user_id = auth.uid()
    )
  );

-- migration_cases: len service role (internal analytics)
CREATE POLICY "migration_cases_service_only" ON migration_cases
  FOR ALL USING (auth.role() = 'service_role');

-- ── 6. UPDATED_AT trigger ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER migration_cases_updated_at
  BEFORE UPDATE ON migration_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 7. COMMENTS ─────────────────────────────────────────────
COMMENT ON TABLE import_jobs IS
  'Universal CRM Import — každý upload súboru = jeden job. Sleduje celý lifecycle od uploadu po import.';
COMMENT ON TABLE import_rows IS
  'Každý riadok z importovaného súboru. Umožňuje error reporting na úrovni riadku.';
COMMENT ON TABLE migration_cases IS
  'Migration Intelligence Register — strategická databáza pre každú migráciu RK. Moat pre Revolis Migration Engine.';
COMMENT ON COLUMN migration_cases.learned_mappings IS
  'Naučené mapovanie stĺpcov pre daný CRM systém. Obohacuje sa pri každej ďalšej migrácii — základ pre auto-mapping.';
COMMENT ON COLUMN import_jobs.time_to_complete IS
  'KPI: čas od spustenia po dokončenie. Cieľ pre Smolko: < 10 minút.';
