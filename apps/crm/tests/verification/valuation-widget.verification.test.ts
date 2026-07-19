import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getValuationAgency, listValuationAgencySlugs } from "@/lib/valuation/agency-config";

const REPO_ROOT = path.resolve(__dirname, "../../..");

describe("valuation widget (Wave 0)", () => {
  it("exposes reality-smolko agency config", () => {
    const agency = getValuationAgency("reality-smolko");
    expect(agency).not.toBeNull();
    expect(agency?.displayName).toContain("Smolko");
  });

  it("has public route page for agency slug", () => {
    const pagePath = path.join(
      REPO_ROOT,
      "src/app/(marketing)/odhad/[agencySlug]/page.tsx",
    );
    expect(fs.existsSync(pagePath)).toBe(true);
  });

  it("registers /odhad/ as chromeless (no dashboard nav)", () => {
    const chromeless = fs.readFileSync(
      path.join(REPO_ROOT, "src/lib/chromeless-routes.ts"),
      "utf8",
    );
    expect(chromeless).toContain("'/odhad/'");
  });

  it("registers valuation submit API as public", () => {
    const proxy = fs.readFileSync(path.join(REPO_ROOT, "src/proxy.ts"), "utf8");
    expect(proxy).toContain("/api/valuation/submit");
  });

  it("lists at least one pilot agency slug", () => {
    expect(listValuationAgencySlugs()).toContain("reality-smolko");
  });
});
