import { describe, expect, it, beforeEach } from "vitest";
import { REALVIA_SMOLKO_13303557 } from "@/lib/capabilities/_shared/fixtures/realvia-smolko-13303557";
import { buildBannerSpecs } from "@/lib/capabilities/banner-factory";
import { clearCapabilityAuditForTests } from "@/lib/capabilities/_shared/audit-log";

const AGENCY = "11111111-1111-1111-1111-111111111111";

describe("banner-factory buildBannerSpecs", () => {
  beforeEach(() => clearCapabilityAuditForTests());

  it("builds state banners from real fixture 13303557", () => {
    const banners = buildBannerSpecs({
      agencyId: AGENCY,
      property: REALVIA_SMOLKO_13303557,
      brandKit: { primaryColor: "#1e3a5f", tone: "professional" },
    });

    expect(banners).toHaveLength(4);
    expect(banners[0].headline).toContain("Na predaj");
    expect(banners[0].headline).toContain("Modrá");
    expect(banners.every((b) => b.guardianPass)).toBe(true);
  });
});
