/**
 * Live spec: Settings auth-email-tests must not allow cross-tenant recovery
 * links, and test invites must stamp agency_id (sibling of invite route).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");
const routeSrc = readFileSync(
  join(ROOT, "src/app/api/settings/auth-email-tests/route.ts"),
  "utf8",
);

describe("auth-email-tests tenant scope (verification)", () => {
  it("scopes cross-user recovery to caller agency_id before generateLink", () => {
    expect(routeSrc).toContain("assertSameAgencyTarget");
    expect(routeSrc).toMatch(/target\.agency_id !== callerAgencyId/);
    expect(routeSrc).toContain("Používateľ nie je v tvojej agentúre.");
  });

  it("stamps agency_id on invite upsert", () => {
    expect(routeSrc).toMatch(/agency_id:\s*profile\.agency_id/);
    expect(routeSrc).toContain("auth_user_id: data.user.id");
    expect(routeSrc).toContain("Chýba agentúra v profile pozývajúceho.");
  });
});
