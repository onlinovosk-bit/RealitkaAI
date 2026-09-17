import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

function read(relative: string): string {
  return readFileSync(join(CRM_ROOT, relative), "utf8");
}

describe("[verification] Match status PATCH mutates through the scoped client", () => {
  it("PATCH /api/leads/[id]/matches/[matchId] threads createClient into the store", () => {
    const route = read("src/app/api/leads/[id]/matches/[matchId]/route.ts");

    expect(route).toContain("const supabase = await createClient()");
    expect(route).toContain("updateLeadPropertyMatchStatus(");
    expect(route).toContain("supabase,");
    expect(route).not.toMatch(
      /updateLeadPropertyMatchStatus\(\s*id,\s*matchId,\s*body\.status\s*\)/,
    );
  });

  it("fail-closes when caller agency_id is missing", () => {
    const route = read("src/app/api/leads/[id]/matches/[matchId]/route.ts");

    expect(route).toContain("if (!callerProfile?.agency_id)");
    expect(route).toContain('error: "Forbidden"');
  });

  it("updateLeadPropertyMatchStatus accepts and forwards a scoped client", () => {
    const store = read("src/lib/matching-store.ts");

    expect(store).toMatch(
      /export async function updateLeadPropertyMatchStatus\([\s\S]*?scoped\?: import\("@supabase\/supabase-js"\)\.SupabaseClient/,
    );
    expect(store).toContain("await resolveTenantSupabase(scoped)");
    expect(store).toContain("getProperty(updated.property_id, scoped)");
  });

  it("addLeadActivity forwards an optional scoped client", () => {
    const store = read("src/lib/leads-store.ts");

    expect(store).toMatch(
      /export async function addLeadActivity\([\s\S]*?scoped\?: import\("@supabase\/supabase-js"\)\.SupabaseClient/,
    );
    expect(store).toContain("await appendActivity(leadId, text, type, meta, scoped)");
  });
});
