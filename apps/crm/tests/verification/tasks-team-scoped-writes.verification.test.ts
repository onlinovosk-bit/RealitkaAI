import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("[verification] Tasks + team scoped writes (R2 remediation)", () => {
  it("POST/PATCH/DELETE /api/tasks pass scoped server client", () => {
    const postRoute = readFileSync(join(CRM_ROOT, "src/app/api/tasks/route.ts"), "utf8");
    const idRoute = readFileSync(join(CRM_ROOT, "src/app/api/tasks/[id]/route.ts"), "utf8");

    expect(postRoute).toContain("createTask({");
    expect(postRoute).toContain("}, supabase)");
    expect(postRoute).toContain("createActivity({");
    expect(idRoute).toContain("updateTask(id, {");
    expect(idRoute).toContain("deleteTask(id, supabase)");
  });

  it("team write routes pass scoped server client", () => {
    const teamsRoute = readFileSync(join(CRM_ROOT, "src/app/api/team/teams/route.ts"), "utf8");
    const usersRoute = readFileSync(join(CRM_ROOT, "src/app/api/team/users/route.ts"), "utf8");
    const assignRoute = readFileSync(join(CRM_ROOT, "src/app/api/team/assign-lead/route.ts"), "utf8");

    expect(teamsRoute).toContain("createTeam({");
    expect(teamsRoute).toContain("}, supabase)");
    expect(usersRoute).toContain("createProfile({");
    expect(usersRoute).toContain("}, supabase)");
    expect(assignRoute).toContain("assignLeadToProfile(leadId, profileId, supabase)");
    expect(assignRoute).toContain("createClient()");
  });

  it("store writers accept optional scoped client", () => {
    const tasksStore = readFileSync(join(CRM_ROOT, "src/lib/tasks-store.ts"), "utf8");
    const teamStore = readFileSync(join(CRM_ROOT, "src/lib/team-store.ts"), "utf8");

    expect(tasksStore).toMatch(/export async function createTask\([\s\S]*scoped\?:/);
    expect(tasksStore).toMatch(/export async function updateTask\([\s\S]*scoped\?:/);
    expect(tasksStore).toMatch(/export async function deleteTask\([\s\S]*scoped\?:/);
    expect(teamStore).toMatch(/export async function createTeam\([\s\S]*scoped\?:/);
    expect(teamStore).toMatch(/export async function createProfile\([\s\S]*scoped\?:/);
    expect(teamStore).toMatch(/export async function assignLeadToProfile\([\s\S]*scoped\?:/);
  });
});
