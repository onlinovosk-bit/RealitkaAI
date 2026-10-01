import { existsSync, readFileSync, readdirSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = resolve(__dirname, "../../../../../../supabase/migrations");

function findSyncMigration(): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) =>
    f.endsWith("_acquisition_sync_tables.sql"),
  );
  expect(files.length).toBe(1);
  return resolve(MIGRATIONS_DIR, files[0]!);
}

describe("acquisition_sync_tables migration (file only)", () => {
  it("ships additive DDL for the four PASS-report hole tables", () => {
    const path = findSyncMigration();
    expect(existsSync(path)).toBe(true);
    expect(path).toMatch(/2026\d+_acquisition_sync_tables\.sql$/);
    const sql = readFileSync(path, "utf8");

    expect(sql).toMatch(/PREP ONLY/i);
    expect(sql).toMatch(/Do not set ACQUISITION_PERSIST_SYNC=true/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.acquisition_ad_groups/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.acquisition_keywords/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.acquisition_search_terms/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.acquisition_metrics/i);

    expect(sql).toMatch(/FOREIGN KEY\s*\(\s*agency_id\s*,\s*acquisition_account_id\s*\)/i);
    expect(sql).toMatch(/UNIQUE\s*\(\s*provider\s*,\s*provider_ad_group_id\s*\)/i);
    expect(sql).toMatch(/UNIQUE\s*\(\s*provider\s*,\s*provider_keyword_id\s*\)/i);
    expect(sql).toMatch(/UNIQUE\s*\(\s*provider\s*,\s*provider_search_term_id\s*\)/i);
    expect(sql).toMatch(/UNIQUE\s*\(\s*provider\s*,\s*provider_metric_id\s*\)/i);
    expect(sql).toMatch(/UNIQUE\s*\(\s*agency_id\s*,\s*id\s*\)/i);

    expect(sql).toMatch(/POLICY "acquisition_ad_groups_tenant"/);
    expect(sql).toMatch(/POLICY "acquisition_keywords_tenant"/);
    expect(sql).toMatch(/POLICY "acquisition_search_terms_tenant"/);
    expect(sql).toMatch(/POLICY "acquisition_metrics_tenant"/);
    expect(sql).toMatch(/profile_agencies_for_auth\(\)/);

    expect(sql).not.toMatch(/ALTER TABLE\s+(IF EXISTS\s+)?public\.leads/i);
    expect(sql).not.toMatch(/ALTER TABLE\s+(IF EXISTS\s+)?public\.acquisition_campaigns/i);
  });
});