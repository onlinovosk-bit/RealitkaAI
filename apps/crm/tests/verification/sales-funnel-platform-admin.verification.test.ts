import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

describe("[verification] Sales funnel platform-admin gate", () => {
  it("update-status requires platform admin before mutating saas_leads", () => {
    const route = read("src/app/api/sales-funnel/update-status/route.ts");
    expect(route).toContain("requirePlatformAdmin");
    const gateIdx = route.indexOf("requirePlatformAdmin");
    const updateIdx = route.indexOf('.from("saas_leads")');
    expect(gateIdx).toBeGreaterThanOrEqual(0);
    expect(updateIdx).toBeGreaterThan(gateIdx);
  });

  it("sales-funnel page hides itself from non-platform-admins", () => {
    const page = read("src/app/(dashboard)/sales-funnel/page.tsx");
    expect(page).toContain("fetchProfilePlatformAdminFlag");
    expect(page).toContain("isPlatformAdmin");
    expect(page).toContain("notFound()");
    expect(page).toContain("getSalesFunnelData(supabase)");
  });

  it("listSaasLeads accepts a scoped server client", () => {
    const store = read("src/lib/sales-funnel-store.ts");
    expect(store).toMatch(/export async function listSaasLeads\(\s*scoped\?/);
    expect(store).toMatch(/export async function getSalesFunnelData\(\s*scoped\?/);
  });
});
