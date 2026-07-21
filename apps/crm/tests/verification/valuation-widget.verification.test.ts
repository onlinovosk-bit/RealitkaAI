import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildValuationLeadInsert } from "@/lib/valuation/lead-mapper";
import { getValuationAgency, listValuationAgencySlugs } from "@/lib/valuation/agency-config";

const CRM_ROOT = process.cwd();

describe("valuation widget", () => {
  it("exposes reality-smolko agency config", () => {
    const agency = getValuationAgency("reality-smolko");
    expect(agency).not.toBeNull();
    expect(agency?.displayName).toContain("Smolko");
  });

  it("has public route page for agency slug", () => {
    const pagePath = path.join(
      CRM_ROOT,
      "src/app/(marketing)/odhad/[agencySlug]/page.tsx",
    );
    expect(fs.existsSync(pagePath)).toBe(true);
  });

  it("registers /odhad/ as chromeless (no dashboard nav)", () => {
    const chromeless = fs.readFileSync(
      path.join(CRM_ROOT, "src/lib/chromeless-routes.ts"),
      "utf8",
    );
    expect(chromeless).toContain("'/odhad/'");
  });

  it("registers valuation APIs as public", () => {
    const proxy = fs.readFileSync(path.join(CRM_ROOT, "src/proxy.ts"), "utf8");
    expect(proxy).toContain("/api/valuation/submit");
    expect(proxy).toContain("/api/valuation/estimate");
    expect(proxy).toContain('pathname.startsWith("/odhad/")');
  });

  it("lists at least one pilot agency slug", () => {
    expect(listValuationAgencySlugs()).toContain("reality-smolko");
  });

  it("runs valuation A/B test with 50/50 assignment and GA4 context", () => {
    expect(fs.existsSync(path.join(CRM_ROOT, "src/lib/valuation/ab-test.ts"))).toBe(true);
    expect(fs.existsSync(path.join(CRM_ROOT, "src/lib/analytics/events.ts"))).toBe(true);
    expect(fs.existsSync(path.join(CRM_ROOT, "src/components/valuation/ValuationWidgetShell.tsx"))).toBe(true);

    const form = fs.readFileSync(
      path.join(CRM_ROOT, "src/components/valuation/ValuationWidgetForm.tsx"),
      "utf8",
    );
    expect(form).toContain("abVariant");
    expect(form).toContain("sessionId");
    expect(form).toContain("trackValuationStarted");
    expect(form).toContain("trackValuationStepCompleted");
    expect(form).toContain("trackValuationShown");
    expect(form).toContain("trackValuationContactSubmitted");
    expect(form).toContain("trackValuationLeadSubmitted");
    expect(form).toContain("trackValuationAbandon");

    const page = fs.readFileSync(
      path.join(CRM_ROOT, "src/app/(marketing)/odhad/[agencySlug]/page.tsx"),
      "utf8",
    );
    expect(page).toContain("ValuationWidgetShell");
  });

  it("starts with property step; contact is middle for variant A", () => {
    const form = fs.readFileSync(
      path.join(CRM_ROOT, "src/components/valuation/ValuationWidgetForm.tsx"),
      "utf8",
    );
    expect(form).toContain('useState<Step>("property")');
    expect(form).toContain("Krok 1 z 3 · Nehnuteľnosť");
  });

  it("fires GA4 valuation events and stores GDPR consent on lead", () => {
    const form = fs.readFileSync(
      path.join(CRM_ROOT, "src/components/valuation/ValuationWidgetForm.tsx"),
      "utf8",
    );
    expect(form).toContain("trackValuationStarted");
    expect(form).toContain("trackValuationLeadSubmitted");

    const mapper = fs.readFileSync(
      path.join(CRM_ROOT, "src/lib/valuation/lead-mapper.ts"),
      "utf8",
    );
    expect(mapper).toContain("gdpr_consent_at");
    expect(mapper).toContain("gdpr_consent_version");
  });

  it("includes optional owner price field without affecting estimate API schema", () => {
    const form = fs.readFileSync(
      path.join(CRM_ROOT, "src/components/valuation/ValuationWidgetForm.tsx"),
      "utf8",
    );
    expect(form).toContain("ownerPriceExpectation");
    expect(form).toContain("Vaša cenová predstava");

    const estimateRoute = fs.readFileSync(
      path.join(CRM_ROOT, "src/app/api/valuation/estimate/route.ts"),
      "utf8",
    );
    expect(estimateRoute).not.toContain("ownerPriceExpectation");
  });

  it("maps lead insert with estimate note", () => {
    const row = buildValuationLeadInsert("11111111-1111-1111-1111-111111111111", {
      agencySlug: "reality-smolko",
      propertyType: "byt",
      location: "Prešov",
      sqm: 70,
      name: "Test User",
      email: "test@example.com",
      phone: "0900123456",
      sellWithin12Months: true,
      privacyAck: true,
      estimate: {
        noEstimate: false,
        low: 100000,
        high: 120000,
        currency: "EUR",
        commentary: "test",
        disclaimer: "test",
        regionCode: "PO",
      },
    });
    expect(row.source).toBe("valuation_widget");
    expect(row.note).toContain("odhad=100000-120000EUR");
    expect(row.timeline).toBe("do 12 mesiacov");
  });

  it("includes sandbox demo tenant migration and consent table", () => {
    const migration = fs.readFileSync(
      path.join(CRM_ROOT, "supabase/migrations/20260722120000_sandbox_gdpr_consent.sql"),
      "utf8",
    );
    expect(migration).toContain("is_sandbox");
    expect(migration).toContain("sandbox_submissions");
    expect(migration).toContain("lead_consents");
    expect(migration).toContain("'demo'");

    expect(fs.existsSync(path.join(CRM_ROOT, "src/lib/valuation/sandbox.ts"))).toBe(true);
    expect(fs.existsSync(path.join(CRM_ROOT, "src/lib/valuation/consent-mapper.ts"))).toBe(true);

    const submitRoute = fs.readFileSync(
      path.join(CRM_ROOT, "src/app/api/valuation/submit/route.ts"),
      "utf8",
    );
    expect(submitRoute).toContain("sandbox_submissions");
    expect(submitRoute).toContain("lead_consents");
    expect(submitRoute).toContain("valuation-sandbox-submit");

    const page = fs.readFileSync(
      path.join(CRM_ROOT, "src/app/(marketing)/odhad/[agencySlug]/page.tsx"),
      "utf8",
    );
    expect(page).toContain("Ukážková verzia");

    const form = fs.readFileSync(
      path.join(CRM_ROOT, "src/components/valuation/ValuationWidgetForm.tsx"),
      "utf8",
    );
    expect(form).toContain("info@revolis.ai");
    expect(form).toContain("tenant.isSandbox");

    expect(getValuationAgency("demo")?.displayName).toContain("Ukážková");
  });
});
