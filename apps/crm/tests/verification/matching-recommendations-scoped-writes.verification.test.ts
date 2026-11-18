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

  it("recalculateAllRecommendations fail-closed before clear on empty or LIST_MAX lead page", () => {
    const recommendationsStore = readFileSync(join(CRM_ROOT, "src/lib/recommendations-store.ts"), "utf8");

    expect(recommendationsStore).toContain("LEADS_LIST_MAX");
    expect(recommendationsStore).toContain("leadInventoryUnsafeForGlobalClear");
    expect(recommendationsStore).toMatch(
      /leadInventoryUnsafeForGlobalClear\(leads\.length\)[\s\S]*clearRecommendations/,
    );
  });

  it("recalculateAllRecommendations fail-closed before clear when match page hits MATCHES_READ_MAX", () => {
    const recommendationsStore = readFileSync(join(CRM_ROOT, "src/lib/recommendations-store.ts"), "utf8");

    expect(recommendationsStore).toContain("MATCHES_READ_MAX");
    expect(recommendationsStore).toContain("matchInventoryUnsafeForGlobalClear");
    expect(recommendationsStore).toMatch(
      /matchInventoryUnsafeForGlobalClear\(matches\.length\)[\s\S]*clearRecommendations/,
    );
  });

  it("per-lead recommendation recalculate scopes match read by lead_id", () => {
    const recommendationsStore = readFileSync(join(CRM_ROOT, "src/lib/recommendations-store.ts"), "utf8");

    expect(recommendationsStore).toContain("listPersistedMatchesForLead");
    expect(recommendationsStore).toMatch(
      /listPersistedMatchesForLead\([\s\S]*\.eq\("lead_id", leadId\)/,
    );
    expect(recommendationsStore).toMatch(
      /recalculateRecommendationsForLead\([\s\S]*listPersistedMatchesForLead\(leadId/,
    );
  });

  it("global match/recommendation clear scopes delete to session lead_id set", () => {
    const matchingStore = readFileSync(join(CRM_ROOT, "src/lib/matching-store.ts"), "utf8");
    const recommendationsStore = readFileSync(join(CRM_ROOT, "src/lib/recommendations-store.ts"), "utf8");

    expect(matchingStore).toMatch(
      /recalculateAll:delete[\s\S]*\.delete\(\)\s*\.in\("lead_id", leadIds\)/,
    );
    expect(matchingStore).not.toMatch(
      /recalculateAll:delete[\s\S]*\.not\("id", "is", null\)/,
    );
    expect(recommendationsStore).toMatch(
      /\.from\("ai_recommendations"\)\s*\.delete\(\)\s*\.in\("lead_id", leadIds\)/,
    );
    expect(recommendationsStore).not.toMatch(
      /\.from\("ai_recommendations"\)\s*\.delete\(\)\s*\.not\("id", "is", null\)/,
    );
  });
});
