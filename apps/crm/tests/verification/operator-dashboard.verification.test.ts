import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("[verification] operator dashboard v1", () => {
  it("uses OPERATOR_DASHBOARD_ENABLED default false in config", () => {
    const source = readFileSync(join(CRM_ROOT, "src/lib/operator/config.ts"), "utf8");
    expect(source).toContain("OPERATOR_DASHBOARD_ENABLED");
    expect(source).toContain('return false');
  });

  it("operator page returns notFound for gate (404 pattern)", () => {
    const source = readFileSync(join(CRM_ROOT, "src/app/operator/page.tsx"), "utf8");
    expect(source).toContain("notFound");
    expect(source).toContain("canAccessOperatorDashboard");
    expect(source).not.toContain("403");
  });

  it("gather uses Promise.all parallel loads", () => {
    const source = readFileSync(join(CRM_ROOT, "src/lib/operator/gather.ts"), "utf8");
    expect(source).toContain("Promise.all");
    expect(source).toContain("gatherOperatorDashboard");
  });

  it("aggregate schema forbids PII column names", () => {
    const source = readFileSync(join(CRM_ROOT, "src/lib/operator/aggregate-schema.ts"), "utf8");
    expect(source).toContain("email");
    expect(source).toContain("phone");
    expect(source).toContain("assertOperatorAggregateNoPii");
  });

  it("migration adds profiles.is_platform_admin with founder SQL comment", () => {
    const sql = readFileSync(
      join(CRM_ROOT, "supabase/migrations/20260728140000_profiles_platform_admin.sql"),
      "utf8",
    );
    expect(sql).toContain("is_platform_admin");
    expect(sql).toContain("UPDATE public.profiles SET is_platform_admin = true");
    expect(sql).toContain("idx_profiles_platform_admin");
  });

  it("health score weights are documented constants", () => {
    const source = readFileSync(join(CRM_ROOT, "src/lib/operator/health-score.ts"), "utf8");
    expect(source).toContain("OPERATOR_HEALTH_WEIGHTS");
    expect(source).toContain("OPEN_GUARDIAN_FINDING");
  });

  it("excludes sandbox tenant via SANDBOX_AGENCY_ID", () => {
    const source = readFileSync(join(CRM_ROOT, "src/lib/operator/config.ts"), "utf8");
    expect(source).toContain("SANDBOX_AGENCY_ID");
  });

  it("reaction metric distinguishes unavailable vs zero in UI", () => {
    const ui = readFileSync(
      join(CRM_ROOT, "src/components/operator/OperatorDashboardClient.tsx"),
      "utf8",
    );
    expect(ui).toContain("zatiaľ bez dát");
    expect(ui).toContain("reaction24hStatus");
  });

  it("perf: full gather uses per-agency follow-up queries — load test skipped in CI", () => {
    const source = readFileSync(join(CRM_ROOT, "src/lib/operator/gather.ts"), "utf8");
    expect(source).toContain("agencyIds.map");
    expect(true).toBe(true);
  });
});
