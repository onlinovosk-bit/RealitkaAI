import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("[verification] Matching + recommendations scoped writes (R3 remediation)", () => {
  it("POST /api/matching/recalculate passes scoped server client", () => {
    const route = readFileSync(
      join(CRM_ROOT, "src/app/api/matching/recalculate/route.ts"),
      "utf8",
    );

    expect(route).toContain("recalculateMatchesForLead(leadId, supabase)");
    expect(route).toContain("recalculateMatchesForProperty(propertyId, supabase)");
    expect(route).toContain("recalculateAllMatches(supabase)");
    expect(route).toContain("createActivity({");
    expect(route).toContain("}, supabase)");
  });

  it("POST /api/recommendations/recalculate passes scoped server client", () => {
    const route = readFileSync(
      join(CRM_ROOT, "src/app/api/recommendations/recalculate/route.ts"),
      "utf8",
    );

    expect(route).toContain("recalculateRecommendationsForLead(leadId, supabase)");
    expect(route).toContain("recalculateAllRecommendations(supabase)");
    expect(route).toContain("createActivity({");
    expect(route).toContain("}, supabase)");
  });

  it("store writers accept optional scoped client", () => {
    const matchingStore = readFileSync(join(CRM_ROOT, "src/lib/matching-store.ts"), "utf8");
    const recommendationsStore = readFileSync(join(CRM_ROOT, "src/lib/recommendations-store.ts"), "utf8");
    const salesFunnelStore = readFileSync(join(CRM_ROOT, "src/lib/sales-funnel-store.ts"), "utf8");

    expect(matchingStore).toMatch(/export async function recalculateMatchesForLead\([\s\S]*scoped\?:/);
    expect(matchingStore).toMatch(/export async function updateLeadPropertyMatchStatus\([\s\S]*scoped\?:/);
    expect(recommendationsStore).toMatch(/export async function recalculateRecommendationsForLead\([\s\S]*scoped\?:/);
    expect(salesFunnelStore).toMatch(/export async function createSaasLead\([\s\S]*scoped\?:/);
    expect(salesFunnelStore).toContain("resolveTenantSupabase(scoped)");
  });

  it("matching recalculate upserts before orphan delete (no wipe window)", () => {
    const matchingStore = readFileSync(join(CRM_ROOT, "src/lib/matching-store.ts"), "utf8");

    expect(matchingStore).toContain("persistRecalculatedMatches");
    expect(matchingStore).toContain('upsert(rows, { onConflict: "lead_id,property_id" })');
    expect(matchingStore).toContain("keeping existing matches");
    // Must not reintroduce delete-then-insert on the lead path.
    expect(matchingStore).not.toMatch(
      /recalculateLead:delete[\s\S]*recalculateLead:insert/,
  it("recalculateAllRecommendations fail-closed before clear on empty or LIST_MAX lead page", () => {
    const recommendationsStore = readFileSync(join(CRM_ROOT, "src/lib/recommendations-store.ts"), "utf8");

    expect(recommendationsStore).toContain("LEADS_LIST_MAX");
    expect(recommendationsStore).toContain("leadInventoryUnsafeForGlobalClear");
    expect(recommendationsStore).toMatch(
      /leadInventoryUnsafeForGlobalClear\(leads\.length\)[\s\S]*clearRecommendations/,
    );
  });
});
