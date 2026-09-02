import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

const ADMIN_ROUTES = [
  "src/app/api/onboarding/mvp/at-risk/route.ts",
  "src/app/api/onboarding/mvp/checklist/route.ts",
  "src/app/api/onboarding/mvp/messages/schedule/route.ts",
] as const;

describe("[verification] Onboarding MVP auth gate", () => {
  it("does not bypass the session gate for /api/onboarding/mvp/", () => {
    const proxy = read("src/proxy.ts");
    expect(proxy).not.toContain('ONBOARDING_MVP_PREFIX');
    expect(proxy).not.toContain('"/api/onboarding/mvp/"');
    expect(proxy).not.toMatch(/pathname\.startsWith\([^)]*onboarding\/mvp/);
  });

  it("requires platform admin before service-role on admin routes", () => {
    for (const rel of ADMIN_ROUTES) {
      const route = read(rel);
      expect(route).toContain("requirePlatformAdmin");
      const gateIdx = route.indexOf("requirePlatformAdmin");
      const serviceIdx = route.indexOf("createServiceRoleClient");
      expect(gateIdx).toBeGreaterThanOrEqual(0);
      expect(serviceIdx).toBeGreaterThan(gateIdx);
    }
  });

  it("deletes unauthenticated mvp dispatch (cron route covers send)", () => {
    expect(
      existsSync(join(CRM_ROOT, "src/app/api/onboarding/mvp/messages/dispatch/route.ts")),
    ).toBe(false);
    const cron = read("src/app/api/cron/onboarding-dispatch/route.ts");
    expect(cron).toContain("runOnboardingDispatch");
    expect(cron).toContain("CRON_SECRET");
  });
});
