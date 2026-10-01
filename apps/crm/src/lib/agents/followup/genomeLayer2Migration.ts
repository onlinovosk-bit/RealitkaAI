import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

export const GENOME_LAYER2_LEGACY_FILENAME = "2026_genome_layer2.sql";
export const GENOME_LAYER2_RENAMED_RE = /^\d{14}_rename_genome_layer2\.sql$/;

export function resolveGenomeLayer2MigrationFilename(files: string[]): string | null {
  const renamed = files.filter((file) => GENOME_LAYER2_RENAMED_RE.test(file)).sort();
  if (renamed.length > 0) return renamed[renamed.length - 1]!;
  if (files.includes(GENOME_LAYER2_LEGACY_FILENAME)) return GENOME_LAYER2_LEGACY_FILENAME;
  return null;
}

export function resolveGenomeLayer2MigrationPath(migrationsDir: string): string {
  const files = existsSync(migrationsDir) ? readdirSync(migrationsDir) : [];
  const filename = resolveGenomeLayer2MigrationFilename(files);
  if (!filename) {
    throw new Error(
      "Genome Layer 2 migration not found. Expected 2026_genome_layer2.sql or YYYYMMDDHHMMSS_rename_genome_layer2.sql",
    );
  }
  return resolve(migrationsDir, filename);
}
