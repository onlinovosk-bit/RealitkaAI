import { mkdtempSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GENOME_LAYER2_LEGACY_FILENAME,
  GENOME_LAYER2_RENAMED_RE,
  resolveGenomeLayer2MigrationFilename,
  resolveGenomeLayer2MigrationPath,
} from "../genomeLayer2Migration";

const MIGRATIONS_DIR = resolve(__dirname, "../../../../../supabase/migrations");

describe("genome layer2 migration dual-name", () => {
  it("prefers the 14-digit rename file over the legacy 2026_ filename", () => {
    expect(
      resolveGenomeLayer2MigrationFilename([
        GENOME_LAYER2_LEGACY_FILENAME,
        "20260817120000_rename_genome_layer2.sql",
      ]),
    ).toBe("20260817120000_rename_genome_layer2.sql");
  });

  it("falls back to the legacy filename when the rename file is absent", () => {
    expect(resolveGenomeLayer2MigrationFilename([GENOME_LAYER2_LEGACY_FILENAME])).toBe(
      GENOME_LAYER2_LEGACY_FILENAME,
    );
  });

  it("returns null when neither name is present", () => {
    expect(resolveGenomeLayer2MigrationFilename(["20260811220000_acquisition_core.sql"])).toBeNull();
  });

  it("resolves a real migrations dir that contains old and/or new genome_layer2 name", () => {
    const files = readdirSync(MIGRATIONS_DIR);
    const resolved = resolveGenomeLayer2MigrationFilename(files);
    expect(resolved).toBeTruthy();
    expect(
      resolved === GENOME_LAYER2_LEGACY_FILENAME || GENOME_LAYER2_RENAMED_RE.test(resolved!),
    ).toBe(true);
    const path = resolveGenomeLayer2MigrationPath(MIGRATIONS_DIR);
    expect(existsSync(path)).toBe(true);
    const sql = readFileSync(path, "utf8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.decisions/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.exclusivity_outcomes/i);
    expect(sql).toMatch(/CREATE OR REPLACE VIEW public\.genome_decision_open/i);
  });

  it("feature-detects a temp dir with only the legacy name", () => {
    const dir = mkdtempSync(join(tmpdir(), "genome-layer2-"));
    writeFileSync(join(dir, GENOME_LAYER2_LEGACY_FILENAME), "-- legacy\n", "utf8");
    expect(resolveGenomeLayer2MigrationPath(dir).endsWith(GENOME_LAYER2_LEGACY_FILENAME)).toBe(true);
  });
});
