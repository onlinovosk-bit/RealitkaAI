import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("[verification] Acquire email gateway", () => {
  it("route verifies Resend webhook on raw body and resolves agency server-side", () => {
    const route = readFileSync(
      join(CRM_ROOT, "src/app/api/acquire/email/route.ts"),
      "utf8",
    );

    expect(route).toContain("req.text()");
    expect(route).not.toContain("req.json()");
    expect(route).toContain("resend.webhooks.verify");
    expect(route).toContain("emails.receiving.get");
    expect(route).toContain("agencyForInbound");
    expect(route).toContain("createServiceRoleClient");
    expect(route).not.toContain("body.agency");
  });

  it("agency_id comes from inbound address map, not parsed email", () => {
    const map = readFileSync(
      join(CRM_ROOT, "src/lib/acquire/agency-map.ts"),
      "utf8",
    );

    expect(map).toContain("smolko@inbound.revolis.ai");
    expect(map).toContain("11111111-1111-1111-1111-111111111111");
    expect(map).not.toContain("parseEmail");
  });

  it("middleware and proxy bypass session auth for acquire email webhook", () => {
    const mw = readFileSync(join(CRM_ROOT, "middleware.ts"), "utf8");
    const proxy = readFileSync(join(CRM_ROOT, "src/proxy.ts"), "utf8");
    expect(mw).toContain("'/api/acquire/email'");
    expect(proxy).toContain('"/api/acquire/email"');
  });
});
