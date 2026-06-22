import { describe, expect, it, beforeEach } from "vitest";
import { REALVIA_SMOLKO_13303557 } from "@/lib/capabilities/_shared/fixtures/realvia-smolko-13303557";
import { realviaRowToUcListing } from "@/lib/capabilities/_shared/realvia-property-row";
import { clearCapabilityAuditForTests } from "@/lib/capabilities/_shared/audit-log";
import { buildVerticalPackDemo } from "@/lib/capabilities/vertical-pack-demo";

const AGENCY = "11111111-1111-1111-1111-111111111111";

describe("vertical-pack-demo buildVerticalPackDemo", () => {
  beforeEach(() => clearCapabilityAuditForTests());

  it("builds listing, banners, decks, microsite and score for 13303557", () => {
    const demo = buildVerticalPackDemo({
      agencyId: AGENCY,
      property: REALVIA_SMOLKO_13303557,
    });

    expect(demo.sourceId).toBe("13303557");
    expect(demo.listing.headline).toContain("Modrá");
    expect(demo.banners.length).toBeGreaterThan(0);
    expect(demo.deckOwner.slides.length).toBeGreaterThan(0);
    expect(demo.deckBuyer.slides.length).toBeGreaterThan(0);
    expect(demo.microsite.heroTitle).toBeTruthy();
    expect(demo.completeness.scorePercent).toBe(44);
  });

  it("strips HTML from description in mapped listing", () => {
    const listing = realviaRowToUcListing({
      ...REALVIA_SMOLKO_13303557,
      description: "Text <br /> s <strong>HTML</strong>.",
    });
    expect(listing.description).toBe("Text s HTML.");
  });
});
