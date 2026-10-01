/**
 * Genome Layer 2 rename — dual-name tolerance until founder applies
 * 20260817120000_rename_genome_layer2.sql via Dashboard SQL + schema_migrations INSERT.
 *
 * Accepts either:
 *   - 2026_genome_layer2.sql (legacy 4-digit version token)
 *   - YYYYMMDDHHMMSS_rename_genome_layer2.sql (14-digit rename)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GENOME_LAYER2_LEGACY_FILENAME,
  GENOME_LAYER2_RENAMED_RE,
  resolveGenomeLayer2MigrationFilename,
} from "@/lib/agents/followup/genomeLayer2Migration";

const MIGRATIONS_DIR = join(__dirname, "../../supabase/migrations");

function readSql(name: string): string {
  return readFileSync(join(MIGRATIONS_DIR, name), "utf8");
}

describe("genome layer2 migration rename (file)", () => {
  it("finds the legacy name and/or a 14-digit rename (dual-name tolerance)", () => {
    const files = existsSync(MIGRATIONS_DIR) ? readdirSync(MIGRATIONS_DIR) : [];
    const resolved = resolveGenomeLayer2MigrationFilename(files);
    expect(resolved, "expected 2026_genome_layer2.sql and/or *_rename_genome_layer2.sql").toBeTruthy();
    expect(
      resolved === GENOME_LAYER2_LEGACY_FILENAME || GENOME_LAYER2_RENAMED_RE.test(resolved!),
    ).toBe(true);
  });

  it("ships idempotent Genome Layer 2 DDL in the resolved file", () => {
    const files = readdirSync(MIGRATIONS_DIR);
    const preferred = resolveGenomeLayer2MigrationFilename(files);
    expect(preferred).toBeTruthy();
    const sql = readSql(preferred!);

    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.decisions/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.exclusivity_outcomes/i);
    expect(sql).toMatch(/CREATE OR REPLACE VIEW public\.genome_decision_open/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS agent/i);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/decisions_service_role/);
    expect(sql).toMatch(/exclusivity_outcomes_service_role/);
  });

  it("14-digit rename file does not write schema_migrations (founder INSERT only)", () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((n) => GENOME_LAYER2_RENAMED_RE.test(n));
    if (files.length === 0) return;
    const sql = readSql(files[0]);
    const uncommented = sql
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    expect(uncommented).not.toMatch(/INSERT\s+INTO\s+supabase_migrations\.schema_migrations/i);
    expect(uncommented).not.toMatch(/supabase\s+db\s+push/i);
  });
});