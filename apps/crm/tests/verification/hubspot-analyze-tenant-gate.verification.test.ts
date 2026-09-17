import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

describe("[verification] HubSpot sync + call analyze fail-closed tenant gate", () => {
  it("HubSpot sync refuses missing caller agency_id before admin sync", () => {
    const route = read("src/app/api/integrations/hubspot/sync/route.ts");

    expect(route).toContain("createAdminClient");
    expect(route).toContain("!callerProfile?.agency_id");
    expect(route).toContain("lead.agency_id !== callerProfile.agency_id");
    // Old fail-open pattern must not remain
    expect(route).not.toMatch(
      /if\s*\(\s*callerProfile\?\.agency_id\s*&&\s*lead\.agency_id\s*!==/,
    );
  });

  it("call analyze refuses missing caller agency or missing lead before admin persist", () => {
    const route = read("src/app/api/ai/call/analyze/route.ts");

    expect(route).toContain("createAdminClient");
    expect(route).toContain("persistCallAnalysisToCrm");
    expect(route).toContain("!callerProfile?.agency_id");
    expect(route).toContain("!leadRow");
    expect(route).toContain("leadRow.agency_id !== callerProfile.agency_id");
    expect(route).not.toMatch(
      /if\s*\(\s*callerProfile\?\.agency_id\s*&&\s*leadRow\?\.agency_id\s*!==/,
    );
  });
});
