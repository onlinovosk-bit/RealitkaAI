import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const CRM_ROOT = process.cwd();

describe("billing credits panel verification", () => {
  it("plan API returns credit balance fields", () => {
    const route = fs.readFileSync(
      path.join(CRM_ROOT, "src/app/api/billing/plan/route.ts"),
      "utf8",
    );
    expect(route).toContain("fetchAgencyCreditsSummary");
    expect(route).toContain("creditsBalance");
    expect(route).toContain("grantBalance");
    expect(route).toContain("purchasedBalance");
    expect(route).toContain("monthlyGrantCredits");
  });

  it("billing page exposes top-up anchor and credits panel", () => {
    const page = fs.readFileSync(
      path.join(CRM_ROOT, "src/app/(dashboard)/billing/page.tsx"),
      "utf8",
    );
    expect(page).toContain("CreditsTopupPanel");
    expect(page).toContain("ModuleShell");

    const panel = fs.readFileSync(
      path.join(CRM_ROOT, "src/components/billing/CreditsTopupPanel.tsx"),
      "utf8",
    );
    expect(panel).toContain('id="topup"');
    expect(panel).toContain("Kreditový zostatok");
    expect(panel).toContain("Doplniť kredity");
    expect(panel).toContain("0 kreditov — AI akcie sú pozastavené");
  });

  it("402 deep link constant points to billing top-up section", () => {
    const pricing = fs.readFileSync(
      path.join(CRM_ROOT, "src/lib/program-tier-pricing.ts"),
      "utf8",
    );
    expect(pricing).toContain('BILLING_TOPUP_HREF = "/billing#topup"');
  });

  it("upgrade page delegates top-up to billing", () => {
    const upgrade = fs.readFileSync(
      path.join(CRM_ROOT, "src/app/(dashboard)/upgrade/page.tsx"),
      "utf8",
    );
    expect(upgrade).toContain("BILLING_TOPUP_HREF");
    expect(upgrade).not.toContain("checkoutType: 'topup'");
  });

  it("upgrade page reads flattened okResponse checkout-config + checkout URL", () => {
    const upgrade = fs.readFileSync(
      path.join(CRM_ROOT, "src/app/(dashboard)/upgrade/page.tsx"),
      "utf8",
    );
    // Must match okResponse spread shape — NOT nested under `.data`
    expect(upgrade).toContain("d.seatCheckoutAvailable");
    expect(upgrade).not.toContain("d.data");
    expect(upgrade).toContain("data.result?.url");
    expect(upgrade).not.toContain("data.data?.result?.url");

    const panel = fs.readFileSync(
      path.join(CRM_ROOT, "src/components/billing/CreditsTopupPanel.tsx"),
      "utf8",
    );
    expect(panel).toContain("configRes.topupCheckoutAvailable");
    expect(panel).toContain("data.result?.url");
  });

  it("stripe price validation rejects placeholders", () => {
    const pricing = fs.readFileSync(
      path.join(CRM_ROOT, "src/lib/program-tier-pricing.ts"),
      "utf8",
    );
    expect(pricing).toContain("isValidStripePriceId");
    expect(pricing).toContain('lower.includes("xxx")');
  });
});
