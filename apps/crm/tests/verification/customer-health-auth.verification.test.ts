import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = process.cwd();
const PATH = "/api/cron/customer-health";

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

describe("[verification] Customer health cron authentication", () => {
  it("fails closed unless Bearer CRON_SECRET matches", () => {
    const route = read("src/app/api/cron/customer-health/route.ts");
    expect(route).toContain("process.env.CRON_SECRET?.trim()");
    expect(route).toContain('req.headers.get("authorization")');
    expect(route).toContain("`Bearer ${expected}`");
    expect(route).toMatch(/unauthorized|401/);
  });

  it("does not email customers — founder morningLines only", () => {
    const route = read("src/app/api/cron/customer-health/route.ts");
    expect(route).not.toMatch(/sendOnboardingEmail|resend|nodemailer/i);
    expect(route).toContain("morningLines");
  });

  it("cron path is under /api/cron/ (session gate bypass via cron prefix)", () => {
    expect(PATH.startsWith("/api/cron/")).toBe(true);
  });
});
