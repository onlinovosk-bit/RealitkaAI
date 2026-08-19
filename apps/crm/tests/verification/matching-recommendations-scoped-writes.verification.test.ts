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
    expect(recommendationsStore).toMatch(/export async function recalculateRecommendationsForLead\([\s\S]*scoped\?:/);
    expect(salesFunnelStore).toMatch(/export async function createSaasLead\([\s\S]*scoped\?:/);
    expect(salesFunnelStore).toContain("resolveTenantSupabase(scoped)");
  });

  it("recalculateAllMatches and property path pass scoped into list/get reads", () => {
    const matchingStore = readFileSync(join(CRM_ROOT, "src/lib/matching-store.ts"), "utf8");

    const allFn = matchingStore.slice(
      matchingStore.indexOf("export async function recalculateAllMatches"),
    );
    const propertyFn = matchingStore.slice(
      matchingStore.indexOf("export async function recalculateMatchesForProperty"),
      matchingStore.indexOf("export async function recalculateAllMatches"),
    );

    expect(allFn).toContain("listLeads(undefined, scoped)");
    expect(allFn).toContain("listProperties(undefined, scoped)");
    expect(allFn).not.toMatch(/listLeads\(\)/);
    expect(allFn).not.toMatch(/listProperties\(\)/);

    expect(propertyFn).toContain("getProperty(propertyId, scoped)");
    expect(propertyFn).toContain("listLeads(undefined, scoped)");
    expect(propertyFn).not.toMatch(/getProperty\(propertyId\)/);
    expect(propertyFn).not.toMatch(/listLeads\(\)/);
  });

  it("matching hooks and lead/property mutation routes thread scoped client", () => {
    const hooks = readFileSync(join(CRM_ROOT, "src/lib/matching-hooks.ts"), "utf8");
    const leadPatch = readFileSync(join(CRM_ROOT, "src/app/api/leads/[id]/route.ts"), "utf8");
    const leadPost = readFileSync(join(CRM_ROOT, "src/app/api/leads/route.ts"), "utf8");
    const propertyPatch = readFileSync(join(CRM_ROOT, "src/app/api/properties/[id]/route.ts"), "utf8");

    expect(hooks).toContain("recalculateMatchesForLead(leadId, scoped)");
    expect(hooks).toContain("recalculateMatchesForProperty(propertyId, scoped)");
    expect(hooks).toContain("recalculateAllMatches(scoped)");
    expect(leadPatch).toContain("autoRecalculateForLead(id, supabase)");
    expect(leadPost).toContain("autoRecalculateForLead(lead.id, supabaseAuth)");
    expect(propertyPatch).toContain("autoRecalculateForProperty(id, supabase)");
  });

  it("recalculate writers do not swallow post-delete timeouts as inserted:0", () => {
    const matchingStore = readFileSync(join(CRM_ROOT, "src/lib/matching-store.ts"), "utf8");

    expect(matchingStore).not.toContain("DB write timeout on recalculate — skipping persist");
  });
});
