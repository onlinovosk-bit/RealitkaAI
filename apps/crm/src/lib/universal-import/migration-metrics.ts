import type { ImportJob, ImportReport, MappedContact } from "@/lib/universal-import/types";

/** % riadkov s menom + (telefón alebo email) — podľa migration_cases.data_quality_score. */
export function computeDataQualityScore(
  mappedRows: Array<Partial<MappedContact> | Record<string, unknown> | null | undefined>,
): number {
  if (mappedRows.length === 0) return 0;

  let good = 0;
  for (const row of mappedRows) {
    if (!row) continue;
    const name = String(row.contact_name ?? "").trim();
    const phone = String(row.phone ?? "").trim();
    const email = String(row.email ?? "").trim();
    if (name && (phone || email)) good += 1;
  }

  return Math.round((good / mappedRows.length) * 100);
}

export function computeDuplicateRate(totalRows: number, duplicateRows: number): number {
  if (totalRows <= 0) return 0;
  return Math.round((duplicateRows / totalRows) * 10000) / 100;
}

export function formatTimeToFirstImport(startedAt: string, completedAt: string): string {
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(completedAt);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return "0 seconds";
  }

  const totalSeconds = Math.round((endMs - startMs) / 1000);
  if (totalSeconds < 60) return `${totalSeconds} seconds`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes} minutes ${seconds} seconds` : `${minutes} minutes`;
}

export function buildMigrationCaseInput(input: {
  job: ImportJob;
  report: ImportReport;
  agencyId: string;
  agencyName: string;
  mappedRows: Array<Partial<MappedContact> | Record<string, unknown>>;
  migrationAttempts: number;
  completedAt: string;
}) {
  const { job, report, agencyId, agencyName, mappedRows, migrationAttempts, completedAt } =
    input;

  return {
    agencyId,
    agencyName,
    sourceCrm: job.sourceSystem,
    sourceCrmVersion: job.sourceVersion,
    exportAvailable: true,
    exportTypes: ["csv"] as string[],
    totalContactsExported: report.totalRows,
    totalContactsImported: report.importedRows,
    dataQualityScore: computeDataQualityScore(mappedRows),
    duplicateRate: computeDuplicateRate(report.totalRows, report.duplicateRows),
    migrationAttempts,
    migratedBy: "self_service" as const,
    timeToFirstImport: formatTimeToFirstImport(job.startedAt, completedAt),
    learnedMappings: job.columnMapping,
    notes: `Universal import ${job.fileName}: ${report.importedRows}/${report.totalRows} imported.`,
  };
}
