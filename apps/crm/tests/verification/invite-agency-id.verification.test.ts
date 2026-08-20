import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Live contract: team invite must stamp the caller's agency_id onto the
 * invitee profile. Regression: upsert omitted agency_id → invitee logged in
 * with null tenant → empty leads/inventory forever.
 */
describe("invite stamps agency_id (verification)", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/invite/route.ts"),
    "utf8",
  );

  it("requires caller agency_id before inviting", () => {
    expect(route).toContain("agency_id");
    expect(route).toMatch(/if\s*\(\s*!profile\.agency_id\s*\)/);
  });

  it("upserts invitee profile with agency_id and auth_user_id", () => {
    expect(route).toContain("agency_id: profile.agency_id");
    expect(route).toContain("auth_user_id: data.user.id");
    expect(route).toContain('onConflict: "id"');
  });

  it("allowlists invite roles (no founder/owner escalation via body)", () => {
    expect(route).toContain('INVITE_ROLES = new Set(["agent", "manager", "admin"])');
    expect(route).toContain("INVITE_ROLES.has(requestedRole)");
  });
});
