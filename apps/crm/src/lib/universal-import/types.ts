// ============================================================
// Universal CRM Import — TypeScript typy
// Súbor: apps/crm/src/lib/universal-import/types.ts
// ============================================================

// ── Zdrojové systémy ────────────────────────────────────────
export type ImportSourceSystem =
  | 'realvia'
  | 'realsoft'
  | 'nehnutelnosti_sk'
  | 'google_contacts'
  | 'vcf'
  | 'outlook_csv'
  | 'flowii'
  | 'generic_csv'
  | 'xlsx';

export const SOURCE_SYSTEM_LABELS: Record<ImportSourceSystem, string> = {
  realvia:           'Realvia CRM',
  realsoft:          'RealSoft',
  nehnutelnosti_sk:  'Nehnuteľnosti.sk export',
  google_contacts:   'Google Kontakty',
  vcf:               'vCard (.vcf)',
  outlook_csv:       'Outlook CSV',
  flowii:            'Flowii CRM',
  generic_csv:       'Všeobecný CSV',
  xlsx:              'Excel (.xlsx)',
};

// ── Cieľové polia v Revolise ────────────────────────────────
export type ImportTargetField =
  | 'contact_name'
  | 'phone'
  | 'email'
  | 'address'
  | 'note'
  | 'budget'
  | 'status'
  | 'source'
  | 'assigned_agent'
  | 'property_type'
  | 'property_area'
  | 'skip';  // zákazník sa rozhodol stĺpec ignorovať

// ── Column mapping ──────────────────────────────────────────
export interface DetectedColumn {
  originalHeader: string;       // "Meno a priezvisko"
  target: ImportTargetField;    // "contact_name"
  confidence: number;           // 0.0 – 1.0
  source: 'auto' | 'manual' | 'learned';
  sampleValues: string[];       // prvých 3 hodnoty z CSV pre preview
}

export type ColumnMapping = Record<string, ImportTargetField>;
// { "Meno a priezvisko": "contact_name", "Mobil": "phone" }

// ── Stav jobu ───────────────────────────────────────────────
export type ImportJobStatus =
  | 'pending'
  | 'detecting'
  | 'mapping'
  | 'preview'
  | 'importing'
  | 'done'
  | 'failed';

export type ImportRowStatus =
  | 'pending'
  | 'imported'
  | 'skipped'
  | 'duplicate'
  | 'error';

export type SkipReason =
  | 'missing_name'
  | 'missing_contact'
  | 'duplicate_phone'
  | 'duplicate_email'
  | 'invalid_format';

// ── Import Job ──────────────────────────────────────────────
export interface ImportJob {
  id:               string;
  agencyId:         string;
  createdBy?:       string;

  sourceSystem:     ImportSourceSystem;
  sourceVersion?:   string;
  fileName:         string;
  fileSizeBytes?:   number;
  fileHash?:        string;

  status:           ImportJobStatus;

  totalRows:        number;
  importedRows:     number;
  skippedRows:      number;
  duplicateRows:    number;
  errorRows:        number;

  detectedColumns?: DetectedColumn[];
  columnMapping?:   ColumnMapping;
  mappingSource:    'auto' | 'manual' | 'learned';

  errorLog?:        ImportRowError[];
  fatalError?:      string;

  startedAt:        string;
  mappingAt?:       string;
  previewAt?:       string;
  importingAt?:     string;
  completedAt?:     string;
  timeToComplete?:  string;
}

// ── Import Row ──────────────────────────────────────────────
export interface ImportRow {
  id:           string;
  jobId:        string;
  agencyId:     string;
  rowNumber:    number;
  rawData:      Record<string, string>;   // pôvodné dáta
  mappedData?:  Partial<MappedContact>;   // po column_mapping
  status:       ImportRowStatus;
  skipReason?:  SkipReason;
  leadId?:      string;
}

export interface ImportRowError {
  row:    number;
  reason: string;
  data?:  Record<string, string>;
}

// ── Namapovaný kontakt ──────────────────────────────────────
export interface MappedContact {
  contact_name:   string;
  phone?:         string;
  email?:         string;
  address?:       string;
  note?:          string;
  budget?:        number;
  status?:        string;
  source?:        string;
  assigned_agent?: string;
  property_type?: string;
  property_area?: string;
}

// ── Import Report (po dokončení) ────────────────────────────
export interface ImportReport {
  jobId:          string;
  fileName:       string;
  sourceSystem:   ImportSourceSystem;
  totalRows:      number;
  importedRows:   number;
  skippedRows:    number;
  duplicateRows:  number;
  errorRows:      number;
  timeToComplete?: string;
  topSkipReasons: { reason: SkipReason; count: number }[];
  downloadErrorCsvUrl?: string;
}

// ── Migration Case ──────────────────────────────────────────
export type MigrationBlockerType =
  | 'gdpr'
  | 'technical'
  | 'format'
  | 'commercial'
  | 'contractual';

export type MigratedBy = 'self_service' | 'assisted' | 'revolis_team';

export interface MigrationCase {
  id:                     string;
  agencyId?:              string;
  agencyName:             string;

  sourceCrm:              string;
  sourceCrmVersion?:      string;
  exportAvailable?:       boolean;
  exportTypes?:           string[];
  daysToGetExport?:       number;

  totalContactsExported?: number;
  totalContactsImported?: number;
  dataQualityScore?:      number;   // 0-100
  duplicateRate?:         number;

  migrationAttempts:      number;
  migratedBy?:            MigratedBy;
  timeToFirstImport?:     string;

  blockerTypes?:          MigrationBlockerType[];
  blockerNotes?:          string;

  revenueUnlockedEur?:    number;
  npsAfterMigration?:     number;

  learnedMappings?:       ColumnMapping;
  notes?:                 string;
  createdAt:              string;
  updatedAt:              string;
}

// ── API Request/Response typy ───────────────────────────────
export interface StartImportRequest {
  sourceSystem: ImportSourceSystem;
  fileName:     string;
  fileSize:     number;
}

export interface StartImportResponse {
  ok:    boolean;
  jobId: string;
}

export interface DetectColumnsResponse {
  ok:               boolean;
  jobId:            string;
  detectedColumns:  DetectedColumn[];
  confidence:       'high' | 'medium' | 'low';
  sourceDetected?:  ImportSourceSystem;
}

export interface ConfirmMappingRequest {
  jobId:         string;
  columnMapping: ColumnMapping;
}

export interface PreviewResponse {
  ok:         boolean;
  jobId:      string;
  totalRows:  number;
  preview:    MappedContact[];   // prvých 5 riadkov
  warnings:   string[];
}

export interface RunImportResponse {
  ok:     boolean;
  report: ImportReport;
}

// ── Column auto-detection pomocné typy ─────────────────────
export const COLUMN_PATTERNS: Record<ImportTargetField, string[]> = {
  contact_name: [
    'meno', 'meno a priezvisko', 'name', 'klient', 'zákazník',
    'kontakt', 'celé meno', 'kto', 'fullname', 'full name',
    'priezvisko a meno', 'meno klienta',
  ],
  phone: [
    'mobil', 'telefón', 'phone', 'tel', 'mobilné číslo', 'číslo',
    'mob', 'mobile', 'telephone', 'kontaktné číslo', 'tel. číslo',
  ],
  email: [
    'email', 'e-mail', 'mail', 'elektronická pošta', 'e mail',
  ],
  address: [
    'adresa', 'ulica', 'bydlisko', 'lokalita', 'address',
    'miesto', 'obec', 'mesto',
  ],
  note: [
    'poznámka', 'popis', 'komentár', 'info', 'note', 'notes',
    'poznámky', 'opis',
  ],
  budget: [
    'rozpočet', 'budget', 'cena', 'suma', 'do koľko', 'price',
    'hodnota', 'maximálna cena', 'max cena',
  ],
  status: [
    'stav', 'status', 'fáza', 'stupeň', 'stage', 'kategória',
  ],
  source: [
    'zdroj', 'source', 'odkiaľ', 'kanál', 'channel',
  ],
  assigned_agent: [
    'maklér', 'agent', 'zodpovedný', 'assigned', 'pridelený',
  ],
  property_type: [
    'typ nehnuteľnosti', 'typ', 'property type', 'druh',
  ],
  property_area: [
    'plocha', 'výmera', 'm2', 'area', 'veľkosť',
  ],
  skip: [],
};
