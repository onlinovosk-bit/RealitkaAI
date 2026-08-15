import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("[verification] Google Ads lead-webhook gateway", () => {
  it("middleware and proxy bypass session auth for Google lead webhook", () => {
    const mw = readFileSync(join(CRM_ROOT, "middleware.ts"), "utf8");
    const proxy = readFileSync(join(CRM_ROOT, "src/proxy.ts"), "utf8");
    expect(mw).toContain("'/api/acquisition/google/lead-webhook'");
    expect(proxy).toContain('"/api/acquisition/google/lead-webhook"');
  });

  it("route never inserts CRM leads in Stage 0", () => {
    const route = readFileSync(
      join(CRM_ROOT, "src/app/api/acquisition/google/lead-webhook/route.ts"),
      "utf8",
    );
    expect(route).toContain('processingStatus = isTest ? "LOGGED_TEST" : "LOGGED_STAGE0"');
    expect(route).toContain("lead_id: null");
    expect(route).not.toMatch(/from\("leads"\)\s*\.insert/);
  });
});