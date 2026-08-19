import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();
const WEBHOOK_PATH = "/api/acquisition/google/lead-webhook";
const ACCOUNTS_PATH = "/api/acquisition/google/accounts";
const AUDIT_LOG_PATH = "/api/acquisition/audit-log";

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

describe("[verification] Google Ads lead-webhook allowlist", () => {
  it("proxy session gate bypasses only the lead-webhook path (not accounts or audit-log)", () => {
    const proxy = read("src/proxy.ts");

    expect(proxy).toContain(`"${WEBHOOK_PATH}"`);

    expect(proxy).not.toContain(`"${ACCOUNTS_PATH}"`);
    expect(proxy).not.toContain(`"${AUDIT_LOG_PATH}"`);
  });

  it("webhook authenticates with google_key in the handler, not a user session", () => {
    const route = read("src/app/api/acquisition/google/lead-webhook/route.ts");
    expect(route).toContain("GOOGLE_ADS_WEBHOOK_KEY");
    expect(route).toContain("x-google-key");
    expect(route).toContain("safeCompare");
    expect(route).not.toMatch(/getUser\s*\(/);
    expect(route).toContain('processingStatus = isTest ? "LOGGED_TEST" : "LOGGED_STAGE0"');
    expect(route).not.toMatch(/from\("leads"\)\s*\.insert/);
  });

  it("accounts and audit-log handlers still call getUser", () => {
    const accounts = read("src/app/api/acquisition/google/accounts/route.ts");
    const audit = read("src/app/api/acquisition/audit-log/route.ts");
    expect(accounts).toMatch(/getUser\s*\(/);
    expect(audit).toMatch(/getUser\s*\(/);
  });
});
