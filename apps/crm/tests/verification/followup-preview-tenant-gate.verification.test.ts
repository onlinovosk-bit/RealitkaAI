import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

describe("[verification] Follow-up preview fail-closed tenant gate", () => {
  it("resolveFollowupAgencyId never falls back to FOLLOWUP_AGENCY_ID", () => {
    const preview = read("src/lib/agents/followup/preview.ts");

    expect(preview).toContain("export function resolveFollowupAgencyId");
    expect(preview).toContain("string | null");
    expect(preview).not.toMatch(
      /return\s+profileAgencyId\?\.trim\(\)\s*\|\|\s*FOLLOWUP_AGENCY_ID/,
    );
  });

  it("GET /api/followup refuses missing agency_id before admin preview", () => {
    const route = read("src/app/api/followup/route.ts");

    expect(route).toContain("resolveFollowupAgencyId");
    expect(route).toContain("buildFollowupPreview");
    expect(route).toContain("!agencyId");
    expect(route).toContain("Forbidden: missing agency_id");
    expect(route).toContain("status: 403");
  });
});
