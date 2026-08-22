import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("[verification] onboarding MVP admin routes are auth-gated", () => {
  it("proxy only bypasses public checklist/schedule — not at-risk or dispatch", () => {
    const proxy = readFileSync(join(CRM_ROOT, "src/proxy.ts"), "utf8");
    expect(proxy).toContain("/api/onboarding/mvp/checklist");
    expect(proxy).toContain("/api/onboarding/mvp/messages/schedule");
    expect(proxy).not.toMatch(/ONBOARDING_MVP_PREFIX\s*=\s*"\/api\/onboarding\/mvp\/"/);
    expect(proxy).not.toMatch(
      /pathname\.startsWith\(\s*ONBOARDING_MVP_PREFIX\s*\)/,
    );
  });

  it("at-risk and dispatch require onboarding operator gate", () => {
    for (const rel of [
      "src/app/api/onboarding/mvp/at-risk/route.ts",
      "src/app/api/onboarding/mvp/messages/dispatch/route.ts",
    ]) {
      const src = readFileSync(join(CRM_ROOT, rel), "utf8");
      expect(src, rel).toContain("requireOnboardingOperator");
    }
  });

  it("public checklist GET uses exact eq (no ILIKE wildcard probe)", () => {
    const src = readFileSync(
      join(CRM_ROOT, "src/app/api/onboarding/mvp/checklist/route.ts"),
      "utf8",
    );
    expect(src).toContain('.eq("company", company)');
    expect(src).toContain('.eq("contact_email", email)');
    expect(src).not.toMatch(/\.ilike\(\s*"company"/);
    expect(src).not.toMatch(/\.ilike\(\s*"contact_email"/);
  });
});
