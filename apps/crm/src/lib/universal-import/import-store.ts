"use server";

import { buildMigrationCaseInput } from "@/lib/universal-import/migration-metrics";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type {
  ColumnMapping,
  DetectedColumn,
  ImportJob,
  ImportJobStatus,
  ImportReport,
  ImportRowStatus,
  ImportSourceSystem,
  MappedContact,
  MigrationCase,
  SkipReason,
} from "@/lib/universal-import/types";

type ImportJobRow = {
  id: string;
  agency_id: string;
  created_by: string | null;
  source_system: ImportSourceSystem;
  source_version: string | null;
  file_name: string;
  file_size_bytes: number | null;
  file_hash: string | null;
  status: ImportJobStatus;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  duplicate_rows: number;
  error_rows: number;
  detected_columns: DetectedColumn[] | null;
  column_mapping: ColumnMapping | null;
  mapping_source: "auto" | "manual" | "learned";
  error_log: ImportJob["errorLog"] | null;
  fatal_error: string | null;
  started_at: string;
  mapping_at: string | null;
  preview_at: string | null;
  importing_at: string | null;
  completed_at: string | null;
  time_to_complete: string | null;
};

function mapImportJob(row: ImportJobRow): ImportJob {
  return {
    id: row.id,
    agencyId: row.agency_id,
    createdBy: row.created_by ?? undefined,
    sourceSystem: row.source_system,
    sourceVersion: row.source_version ?? undefined,
    fileName: row.file_name,
    fileSizeBytes: row.file_size_bytes ?? undefined,
    fileHash: row.file_hash ?? undefined,
    status: row.status,
    totalRows: row.total_rows ?? 0,
    importedRows: row.imported_rows ?? 0,
    skippedRows: row.skipped_rows ?? 0,
    duplicateRows: row.duplicate_rows ?? 0,
    errorRows: row.error_rows ?? 0,
    detectedColumns: row.detected_columns ?? undefined,
    columnMapping: row.column_mapping ?? undefined,
    mappingSource: row.mapping_source ?? "auto",
    errorLog: row.error_log ?? undefined,
    fatalError: row.fatal_error ?? undefined,
    startedAt: row.started_at,
    mappingAt: row.mapping_at ?? undefined,
    previewAt: row.preview_at ?? undefined,
    importingAt: row.importing_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    timeToComplete: row.time_to_complete ?? undefined,
  };
}

function jobRowToDbPatch(extra: Partial<ImportJob>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (extra.status !== undefined) patch.status = extra.status;
  if (extra.totalRows !== undefined) patch.total_rows = extra.totalRows;
  if (extra.importedRows !== undefined) patch.imported_rows = extra.importedRows;
  if (extra.skippedRows !== undefined) patch.skipped_rows = extra.skippedRows;
  if (extra.duplicateRows !== undefined) patch.duplicate_rows = extra.duplicateRows;
  if (extra.errorRows !== undefined) patch.error_rows = extra.errorRows;
  if (extra.detectedColumns !== undefined) patch.detected_columns = extra.detectedColumns;
  if (extra.columnMapping !== undefined) patch.column_mapping = extra.columnMapping;
  if (extra.mappingSource !== undefined) patch.mapping_source = extra.mappingSource;
  if (extra.errorLog !== undefined) patch.error_log = extra.errorLog;
  if (extra.fatalError !== undefined) patch.fatal_error = extra.fatalError;
  if (extra.mappingAt !== undefined) patch.mapping_at = extra.mappingAt;
  if (extra.previewAt !== undefined) patch.preview_at = extra.previewAt;
  if (extra.importingAt !== undefined) patch.importing_at = extra.importingAt;
  if (extra.completedAt !== undefined) patch.completed_at = extra.completedAt;
  return patch;
}

export async function createImportJob(input: {
  agencyId: string;
  createdBy: string;
  sourceSystem: ImportSourceSystem;
  fileName: string;
  fileSizeBytes: number;
}): Promise<ImportJob> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_jobs")
    .insert({
      agency_id: input.agencyId,
      created_by: input.createdBy,
      source_system: input.sourceSystem,
      file_name: input.fileName,
      file_size_bytes: input.fileSizeBytes,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nepodarilo sa vytvoriť import job.");
  }

  return mapImportJob(data as ImportJobRow);
}

export async function updateImportJobStatus(
  jobId: string,
  status: ImportJobStatus,
  extra?: Partial<ImportJob>,
): Promise<void> {
  const supabase = await createClient();
  const patch = {
    status,
    ...jobRowToDbPatch(extra ?? {}),
  };

  const { error } = await supabase.from("import_jobs").update(patch).eq("id", jobId);
  if (error) throw new Error(error.message);
}

export async function saveDetectedColumns(
  jobId: string,
  detectedColumns: DetectedColumn[],
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("import_jobs")
    .update({
      detected_columns: detectedColumns,
      status: "mapping",
      mapping_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) throw new Error(error.message);
}

export async function saveColumnMapping(
  jobId: string,
  columnMapping: ColumnMapping,
  mappingSource: "auto" | "manual" | "learned",
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("import_jobs")
    .update({
      column_mapping: columnMapping,
      mapping_source: mappingSource,
      status: "preview",
      preview_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) throw new Error(error.message);
}

export async function saveImportRows(
  jobId: string,
  agencyId: string,
  rows: Array<{ rowNumber: number; rawData: Record<string, string> }>,
): Promise<void> {
  const supabase = await createClient();
  const payload = rows.map((row) => ({
    job_id: jobId,
    agency_id: agencyId,
    row_number: row.rowNumber,
    raw_data: row.rawData,
    status: "pending" as const,
  }));

  const { error } = await supabase.from("import_rows").insert(payload);
  if (error) throw new Error(error.message);

  const { error: countError } = await supabase
    .from("import_jobs")
    .update({ total_rows: rows.length })
    .eq("id", jobId);
  if (countError) throw new Error(countError.message);
}

type ImportRowDb = {
  id: string;
  job_id: string;
  agency_id: string;
  row_number: number;
  raw_data: Record<string, string>;
  mapped_data: Record<string, unknown> | null;
  status: ImportRowStatus;
  skip_reason: SkipReason | null;
  lead_id: string | null;
};

export async function listImportRows(
  jobId: string,
  limit?: number,
): Promise<Array<{
  id: string;
  jobId: string;
  agencyId: string;
  rowNumber: number;
  rawData: Record<string, string>;
  mappedData?: Record<string, unknown>;
  status: ImportRowStatus;
  skipReason?: SkipReason;
  leadId?: string;
}>> {
  const supabase = await createClient();
  let query = supabase
    .from("import_rows")
    .select("*")
    .eq("job_id", jobId)
    .order("row_number", { ascending: true });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const typed = row as ImportRowDb;
    return {
      id: typed.id,
      jobId: typed.job_id,
      agencyId: typed.agency_id,
      rowNumber: typed.row_number,
      rawData: typed.raw_data,
      mappedData: typed.mapped_data ?? undefined,
      status: typed.status,
      skipReason: typed.skip_reason ?? undefined,
      leadId: typed.lead_id ?? undefined,
    };
  });
}

export async function updateImportRow(
  rowId: string,
  status: ImportRowStatus,
  leadId?: string,
  skipReason?: SkipReason,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("import_rows")
    .update({
      status,
      lead_id: leadId ?? null,
      skip_reason: skipReason ?? null,
    })
    .eq("id", rowId);

  if (error) throw new Error(error.message);
}

export async function getImportJob(jobId: string): Promise<ImportJob | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapImportJob(data as ImportJobRow);
}

export async function listImportJobs(agencyId: string): Promise<ImportJob[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("agency_id", agencyId)
    .order("started_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapImportJob(row as ImportJobRow));
}

export async function listImportErrorRows(
  jobId: string,
): Promise<
  Array<{
    rowNumber: number;
    rawData: Record<string, string>;
    status: ImportRowStatus;
    skipReason?: SkipReason;
  }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_rows")
    .select("row_number, raw_data, status, skip_reason")
    .eq("job_id", jobId)
    .in("status", ["skipped", "error", "duplicate"])
    .order("row_number", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    rowNumber: row.row_number as number,
    rawData: row.raw_data as Record<string, string>,
    status: row.status as ImportRowStatus,
    skipReason: (row.skip_reason as SkipReason | null) ?? undefined,
  }));
}

async function countMigrationAttempts(agencyId: string, sourceCrm: string): Promise<number> {
  const supabase = createServiceRoleClient();
  if (!supabase) return 1;

  const { count, error } = await supabase
    .from("migration_cases")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .eq("source_crm", sourceCrm);

  if (error) return 1;
  return (count ?? 0) + 1;
}

export async function recordMigrationCaseFromImport(input: {
  job: ImportJob;
  report: ImportReport;
  agencyId: string;
  agencyName: string;
  mappedRows: Array<Partial<MappedContact> | Record<string, unknown>>;
}): Promise<void> {
  const completedAt = new Date().toISOString();
  const migrationAttempts = await countMigrationAttempts(input.agencyId, input.job.sourceSystem);
  const payload = buildMigrationCaseInput({
    ...input,
    migrationAttempts,
    completedAt,
  });

  await createMigrationCase(payload);
}

export async function createMigrationCase(
  input: Omit<MigrationCase, "id" | "createdAt" | "updatedAt">,
): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    console.warn("[migration_cases] Service role unavailable — skipping analytics insert.");
    return;
  }

  const { error } = await supabase.from("migration_cases").insert({
    agency_id: input.agencyId ?? null,
    agency_name: input.agencyName,
    source_crm: input.sourceCrm,
    source_crm_version: input.sourceCrmVersion ?? null,
    export_available: input.exportAvailable ?? null,
    export_types: input.exportTypes ?? null,
    days_to_get_export: input.daysToGetExport ?? null,
    total_contacts_exported: input.totalContactsExported ?? null,
    total_contacts_imported: input.totalContactsImported ?? null,
    data_quality_score: input.dataQualityScore ?? null,
    duplicate_rate: input.duplicateRate ?? null,
    migration_attempts: input.migrationAttempts,
    migrated_by: input.migratedBy ?? null,
    time_to_first_import: input.timeToFirstImport ?? null,
    blocker_types: input.blockerTypes ?? null,
    blocker_notes: input.blockerNotes ?? null,
    revenue_unlocked_eur: input.revenueUnlockedEur ?? null,
    nps_after_migration: input.npsAfterMigration ?? null,
    learned_mappings: input.learnedMappings ?? null,
    notes: input.notes ?? null,
  });

  if (error) throw new Error(error.message);
}
