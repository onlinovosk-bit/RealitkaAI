import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("[verification] assign-lead same-agency gate", () => {
  it("assignLeadToProfile verifies target profile agency and scopes lead update", () => {
    const teamStore = readFileSync(
      join(CRM_ROOT, "src/lib/team-store.ts"),
      "utf8",
    );

    expect(teamStore).toMatch(
      /export async function assignLeadToProfile\([\s\S]*scoped\?:/,
    );
    expect(teamStore).toContain('from("profiles")');
    expect(teamStore).toContain('.eq("agency_id", agencyId)');
    expect(teamStore).toContain("Agent nepatrí do vašej agentúry");
    expect(teamStore).toContain(
      "Lead nebol nájdený alebo nepatrí do vašej agentúry",
    );

    // Must not silently succeed without a client (old bug).
    expect(teamStore).not.toMatch(
      /if \(!supabase\) \{\s*return \{ ok: true \};\s*\}/,
    );

    // Must not resolve the assignee via unscoped listProfiles().
    const assignFn = teamStore.slice(
      teamStore.indexOf("export async function assignLeadToProfile"),
      teamStore.indexOf(
        "export async function getTeamDashboardData",
        teamStore.indexOf("export async function assignLeadToProfile"),
      ),
    );
    expect(assignFn).not.toContain("listProfiles()");
  });

  it("POST /api/team/assign-lead still threads the scoped server client", () => {
    const assignRoute = readFileSync(
      join(CRM_ROOT, "src/app/api/team/assign-lead/route.ts"),
      "utf8",
    );
    expect(assignRoute).toContain(
      "assignLeadToProfile(leadId, profileId, supabase)",
    );
  });
});
