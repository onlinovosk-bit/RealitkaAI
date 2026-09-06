import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();
const REPO_ROOT = join(CRM_ROOT, "../..");

describe("[verification] onboarding_sessions Path B (API + DROP anon ALL)", () => {
  it("migration drops Allow anon access and is marked not applied by agent", () => {
    const sqlPath = join(
      CRM_ROOT,
      "supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql",
    );
    expect(existsSync(sqlPath)).toBe(true);
    const sql = readFileSync(sqlPath, "utf8");
    expect(sql).toContain('DROP POLICY IF EXISTS "Allow anon access"');
    expect(sql).toContain("onboarding_sessions");
    expect(sql).toMatch(/PREPARED ONLY|do NOT apply/i);
  });

  it("rollback runbook recreates Allow anon access", () => {
    const rb = readFileSync(
      join(REPO_ROOT, "docs/runbooks/rollback-onboarding-sessions-anon.md"),
      "utf8",
    );
    expect(rb).toContain('CREATE POLICY "Allow anon access"');
    expect(rb).toContain("onboarding_sessions");
  });

  it("session API route uses service role and requires session_id", () => {
    const route = readFileSync(
      join(CRM_ROOT, "src/app/api/onboarding/session/route.ts"),
      "utf8",
    );
    expect(route).toContain("createServiceRoleClient");
    expect(route).toContain("isOnboardingSessionId");
    expect(route).toContain("rateLimit");
    expect(route).not.toMatch(/\.select\(\s*["']\*["']\s*\)/);
  });

  it("browser onboarding clients no longer query onboarding_sessions directly", () => {
    const paths = [
      "src/app/onboarding/useOnboarding.ts",
      "src/app/onboarding/OnboardingClient.tsx",
      "src/app/test-db/TestDbClient.tsx",
    ];
    for (const rel of paths) {
      const src = readFileSync(join(CRM_ROOT, rel), "utf8");
      expect(src, rel).not.toContain('.from("onboarding_sessions")');
      expect(src, rel).toMatch(/upsertOnboardingSession|getOnboardingSession/);
    }
  });
});