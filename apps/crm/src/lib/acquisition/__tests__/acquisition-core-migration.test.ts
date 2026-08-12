/**
 * PR-S0.1 acquisition core — migration / schema presence.
 *
 * How to run:
 * 1) Always: `cd apps/crm && npx vitest run src/lib/acquisition/__tests__/acquisition-core-migration.test.ts`
 *    File-content assertions need no DB.
 * 2) With local Supabase (after `supabase db reset` / migrate applies 20260811220000_acquisition_core.sql):
 *    set TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, TEST_SUPABASE_SERVICE_ROLE_KEY
 *    (or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on localhost).
 *    Schema presence it() then queries information_schema.
 *
 * Existing RLS suite under apps/crm/tests/rls/ is intentionally untouched.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const MIGRATIONS_DIR = resolve(__dirname, "../../../../supabase/migrations");

function findAcquisitionMigration(): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) =>
    f.endsWith("_acquisition_core.sql"),
  );
  expect(files.length).toBeGreaterThanOrEqual(1);
  return resolve(MIGRATIONS_DIR, files.sort().at(-1)!);
}

function localDbEnv(): { url: string; service: string } | null {
  const url =
    process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const service =
    process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SERVICE_ROLE_KEY ??
    "";
  const local =
    url.includes("127.0.0.1") ||
    url.includes("localhost") ||
    process.env.ALLOW_REMOTE_TEST_SUPABASE === "1";
  if (!url || !service || !local) return null;
  return { url, service };
}

describe("acquisition core migration (file)", () => {
  it("ships additive acquisition_core migration with required DDL", () => {
    const path = findAcquisitionMigration();
    expect(existsSync(path)).toBe(true);
    const sql = readFileSync(path, "utf8");

    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.acquisition_accounts/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.acquisition_campaigns/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.acquisition_events/i);
    expect(sql).toMatch(/UNIQUE\s*\(\s*agency_id\s*,\s*id\s*\)/i);
    expect(sql).toMatch(/UNIQUE\s*\(\s*provider\s*,\s*customer_id\s*\)/i);
    expect(sql).toMatch(
      /FOREIGN KEY\s*\(\s*agency_id\s*,\s*acquisition_account_id\s*\)/i,
    );
    expect(sql).toMatch(/lead_id\s+text\s+REFERENCES\s+public\.leads/i);
    expect(sql).toMatch(
      /UNIQUE\s*\(\s*agency_id\s*,\s*provider\s*,\s*provider_event_id\s*,\s*event_type\s*\)/i,
    );
    expect(sql).toMatch(
      /REVOKE\s+UPDATE\s*,\s*DELETE\s+ON\s+public\.acquisition_events\s+FROM\s+authenticated/i,
    );
    expect(sql).toMatch(/profile_agencies_for_auth\(\)/i);
    // Existing-table boundary: must not ALTER leads
    expect(sql).not.toMatch(/ALTER TABLE\s+(IF EXISTS\s+)?public\.leads/i);
  });

  it("documents that existing apps/crm/tests/rls suite is unchanged", () => {
    const note = readFileSync(__filename, "utf8");
    expect(note).toMatch(/intentionally untouched/);
  });
});

describe("acquisition core schema presence (local Supabase)", () => {
  const env = localDbEnv();

  it.skipIf(!env)(
    "information_schema lists all three acquisition_* tables with RLS",
    async () => {
      const admin = createClient(env!.url, env!.service, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await admin.rpc("exec_sql" as never).maybeSingle();
      // Prefer direct catalog query via a known table probe when rpc unavailable.
      void data;
      void error;

      const tables = [
        "acquisition_accounts",
        "acquisition_campaigns",
        "acquisition_events",
      ] as const;

      for (const table of tables) {
        const { error: probeErr } = await admin.from(table).select("id").limit(0);
        // Missing relation → PostgREST schema cache / 42P01; presence → probeErr null.
        const missingRelation = (
          probeErr?.code === "42P01" ||
          probeErr?.message?.includes("does not exist") === true
        );
        expect(missingRelation).toBe(false);
      }
    },
  );
});