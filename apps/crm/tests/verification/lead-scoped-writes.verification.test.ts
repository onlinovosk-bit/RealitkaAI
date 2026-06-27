import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("[verification] Lead scoped writes (R1 remediation)", () => {
  it("PATCH/DELETE/GET /api/leads/[id] pass scoped server client to store writers", () => {
    const route = readFileSync(
      join(CRM_ROOT, "src/app/api/leads/[id]/route.ts"),
      "utf8",
    );

    expect(route).toContain("const supabase = await createClient()");
    expect(route).toContain("getLead(id, supabase)");
    expect(route).toContain("updateLead(id, {");
    expect(route).toContain("}, supabase)");
    expect(route).toContain("deleteLead(id, supabase)");
    expect(route).toContain("createActivity({");
    expect(route).toContain("}, supabase)");
  });

  it("POST/GET /api/leads/[id]/activities pass scoped server client", () => {
    const route = readFileSync(
      join(CRM_ROOT, "src/app/api/leads/[id]/activities/route.ts"),
      "utf8",
    );

    expect(route).toContain("getActivitiesByLeadId(id, supabase)");
    expect(route).toContain("createActivity({");
    expect(route).toContain("}, supabase)");
    expect(route).toContain("getLead(id, supabase)");
  });

  it("store writers accept optional scoped client", () => {
    const leadsStore = readFileSync(
      join(CRM_ROOT, "src/lib/leads-store.ts"),
      "utf8",
    );
    const activitiesStore = readFileSync(
      join(CRM_ROOT, "src/lib/activities-store.ts"),
      "utf8",
    );

    expect(leadsStore).toMatch(/export async function getLead\([\s\S]*scoped\?:/);
    expect(leadsStore).toMatch(/export async function updateLead\([\s\S]*scoped\?:/);
    expect(leadsStore).toMatch(/export async function deleteLead\([\s\S]*scoped\?:/);
    expect(leadsStore).toMatch(/export async function getActivitiesByLeadId\([\s\S]*scoped\?:/);
    expect(activitiesStore).toMatch(/export async function createActivity\([\s\S]*scoped\?:/);
    expect(activitiesStore).toContain("resolveTenantSupabase(scoped)");
  });
});
