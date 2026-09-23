import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Živá špecifikácia: assignment rules sú tenant-scoped.
 * Cookie-less anon client + fail-open ownership = cross-tenant wipe.
 */
describe("assignment-rules-tenant-gate verification", () => {
  const root = join(process.cwd(), "src");

  it("store no longer builds a cookie-less anon singleton", () => {
    const store = readFileSync(join(root, "lib/lead-automation-store.ts"), "utf8");
    expect(store).toContain("resolveTenantSupabase");
    expect(store).not.toMatch(/persistSession:\s*false/);
    expect(store).toMatch(/\.eq\(["']agency_id["']/);
    expect(store).toMatch(/agency_id:\s*tenantAgencyId|agencyId:\s*tenantAgencyId/);
  });

  it("[id] route fails closed on missing rule and requires caller agency_id", () => {
    const route = readFileSync(join(root, "app/api/automation/rules/[id]/route.ts"), "utf8");
    expect(route).toContain("Chýba agency_id");
    expect(route).toContain('status: 404');
    expect(route).not.toMatch(/if\s*\(\s*!rule\s*\)\s*return\s*\{\s*ok:\s*true/);
  });

  it("collection route stamps agencyId from caller profile", () => {
    const route = readFileSync(join(root, "app/api/automation/rules/route.ts"), "utf8");
    expect(route).toContain("agencyId: auth.agencyId");
    expect(route).toContain("listAssignmentRules(auth.agencyId");
  });

  it("migration adds agency_id and replaces open demo RLS", () => {
    const mig = readFileSync(
      join(process.cwd(), "supabase/migrations/20260827230000_lead_assignment_rules_tenant_rls.sql"),
      "utf8",
    );
    expect(mig).toContain("ADD COLUMN IF NOT EXISTS agency_id");
    expect(mig).toContain("DROP POLICY IF EXISTS \"demo_select_lead_assignment_rules\"");
    expect(mig).toContain("profile_agencies_for_auth()");
    expect(mig).toContain("REVOKE ALL ON public.lead_assignment_rules FROM anon");
  });
});
