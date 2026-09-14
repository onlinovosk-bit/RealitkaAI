import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = join(__dirname, "../..");

/**
 * Live contract: public demo request must use service-role for saas_leads +
 * orphan CRM follow-up task (tasks_agency rejects lead_id null under anon).
 */
describe("demo-booking service-role contract", () => {
  it("sales-funnel demo-request passes service role into createSaasLead + automation", () => {
    const src = readFileSync(
      join(CRM_ROOT, "src/app/api/sales-funnel/demo-request/route.ts"),
      "utf8",
    );
    expect(src).toMatch(/createServiceRoleClient/);
    expect(src).toMatch(/createSaasLead\([\s\S]*service/);
    expect(src).toMatch(/runDemoBookingAutomation\([\s\S]*service/);
    expect(src).toMatch(/if \(!automation\.ok\)/);
  });

  it("createDemoBookingTask defaults to service-role, not browser getSupabaseClient", () => {
    const src = readFileSync(
      join(CRM_ROOT, "src/lib/demo-booking-store.ts"),
      "utf8",
    );
    expect(src).toMatch(/createServiceRoleClient/);
    expect(src).not.toMatch(/getSupabaseClient\(\)/);
    expect(src).toMatch(/lead_id:\s*null/);
  });

  it("createSaasLead fails closed on insert error (no fake UUID return)", () => {
    const src = readFileSync(
      join(CRM_ROOT, "src/lib/sales-funnel-store.ts"),
      "utf8",
    );
    expect(src).toMatch(/throw new Error\(error\.message\)/);
    expect(src).not.toMatch(/createSaasLead fallback/);
  });
});
