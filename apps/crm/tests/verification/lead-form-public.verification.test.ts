import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("[verification] B1 public lead form (Wave B)", () => {
  it("inbound route is self-contained and does not import leads-store", () => {
    const route = readFileSync(
      join(CRM_ROOT, "src/app/api/leads/inbound/route.ts"),
      "utf8",
    );

    expect(route).not.toContain("leads-store");
    expect(route).toContain("createServiceRoleClient");
    expect(route).toContain("resolveInboundAgency");
    expect(route).toContain('source: "web_form"');
    expect(route).toContain("agency_id: resolved.agencyId");
    expect(route).toContain("request.formData()");
    expect(route).toContain("honeypot");
    expect(route).toContain("rateLimit");
  });

  it("public form page lives under src/app/f/[slug]", () => {
    const page = readFileSync(
      join(CRM_ROOT, "src/app/f/[slug]/page.tsx"),
      "utf8",
    );

    expect(page).toContain('action="/api/leads/inbound"');
    expect(page).toContain('name="consent"');
    expect(page).toContain('name="hp"');
    expect(page).toContain("getSmolkoInboundConfig");
  });

  it("agency_id comes from server env mapping, not request body", () => {
    const config = readFileSync(
      join(CRM_ROOT, "src/lib/leads/inbound-form-config.ts"),
      "utf8",
    );

    expect(config).toContain("LEAD_FORM_TOKEN_SMOLKO");
    expect(config).toContain("LEAD_FORM_AGENCY_ID_SMOLKO");
    expect(config).toContain("timingSafeEqual");
    expect(config).not.toContain("body.agency");
  });

  it("middleware bypasses session auth for public inbound route", () => {
    const mw = readFileSync(join(CRM_ROOT, "middleware.ts"), "utf8");
    expect(mw).toContain("'/api/leads/inbound'");
  });
});
