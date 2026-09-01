import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("[verification] inbound-lead webhook fail-closed + tenant stamp", () => {
  it("requires INBOUND_WEBHOOK_SECRET and service-role client", () => {
    const route = readFileSync(
      join(CRM_ROOT, "src/app/api/webhooks/inbound-lead/route.ts"),
      "utf8",
    );
    expect(route).toContain("INBOUND_WEBHOOK_SECRET");
    expect(route).toContain("Webhook not configured");
    expect(route).toContain("createServiceRoleClient");
    expect(route).toContain("processInboundLead(");
    expect(route).toMatch(/processInboundLead\([\s\S]*supabase/);
    expect(route).not.toMatch(/if \(secret\) \{/);
  });

  it("processInboundLead checks insert errors and stamps agency_id", () => {
    const store = readFileSync(join(CRM_ROOT, "src/lib/inbound/process-lead.ts"), "utf8");
    expect(store).toContain("agency_id: agencyId");
    expect(store).toContain("profile_missing_agency");
    expect(store).toContain("if (insertError)");
    expect(store).toContain("bri?.new_score ?? 0");
    expect(store).toContain("if (!bri || briScore < BRI_REPLY_THRESHOLD");
  });
});
