import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("Guardian v1 verification", () => {
  it("partial unique index in migration SQL", () => {
    const sql = readFileSync(
      join(CRM_ROOT, "supabase/migrations/20260727120000_guardian_v1_blok_c.sql"),
      "utf8",
    );
    expect(sql).toContain("guardian_open_unique");
    expect(sql).toContain("WHERE resolved_at IS NULL");
  });

  it("MIGRATION founder copy exists", () => {
    const path = join(CRM_ROOT, "supabase/MIGRATION_guardian_v1_blok_c.sql");
    const sql = readFileSync(path, "utf8");
    expect(sql).toContain("guardian_findings");
  });

  it("digest default off in config", () => {
    const source = readFileSync(join(CRM_ROOT, "src/lib/guardian/config.ts"), "utf8");
    expect(source).toContain("GUARDIAN_DIGEST_ENABLED");
    expect(source).toContain("return false");
  });

  it("v1.1 allowlist env documented in config", () => {
    const source = readFileSync(join(CRM_ROOT, "src/lib/guardian/config.ts"), "utf8");
    expect(source).toContain("GUARDIAN_AGENCY_ALLOWLIST");
    expect(source).toContain("filterAgenciesForGuardianRun");
  });

  it("STALE v1.1 thresholds in config", () => {
    const source = readFileSync(join(CRM_ROOT, "src/lib/guardian/config.ts"), "utf8");
    expect(source).toContain("R1_STALE_ACTIVITY_WINDOW_DAYS: 90");
    expect(source).toContain("R1_STALE_QUIET_DAYS: 7");
  });
});
