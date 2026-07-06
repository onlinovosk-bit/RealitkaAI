import { describe, expect, it } from "vitest";
import { UC_DOC_LISTING_SAMPLE } from "@/lib/uc/fixtures";
import { mapUcListingPayload } from "@/lib/uc/mapper-listing";
import { generateListingDraft } from "@/lib/capabilities/listing-generator";
import { REALVIA_SMOLKO_13303557 } from "@/lib/capabilities/_shared/fixtures/realvia-smolko-13303557";
import { realviaRowToUcListing } from "@/lib/capabilities/_shared/realvia-property-row";

const AGENCY = "11111111-1111-1111-1111-111111111111";

describe("listing-generator generateListingDraft", () => {
  it("generates headline and body from real UC fields and passes Guardian", () => {
    const listing = mapUcListingPayload({ ...UC_DOC_LISTING_SAMPLE });
    const result = generateListingDraft({ agencyId: AGENCY, listing });

    expect(result.headline).toBe("Nadpis");
    expect(result.body).toContain("569");
    expect(result.body).toContain("24");
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.guardian.verdict).toBe("pass");
    expect(result.guardian.blockedPublish).toBe(false);
  });

  it("uses langData when present", () => {
    const listing = mapUcListingPayload({
      ...UC_DOC_LISTING_SAMPLE,
      langData: {
        sk: { title: "SK titulok", description: "SK popis" },
        en: { title: "Title", description: "Description" },
      },
    });
    const result = generateListingDraft({ agencyId: AGENCY, listing });
    expect(result.headline).toBe("SK titulok");
    expect(result.body).toContain("SK popis");
  });

  it("Guardian PASS on real Smolko 13303557 — no Cena 0 EUR when price=0", () => {
    const listing = realviaRowToUcListing(REALVIA_SMOLKO_13303557);
    const result = generateListingDraft({ agencyId: AGENCY, listing });

    expect(result.guardian.verdict).toBe("pass");
    expect(result.guardian.blockedPublish).toBe(false);
    expect(result.body).not.toContain("0 EUR");
    expect(result.body).not.toMatch(/Cena\s+0/);
  });

  it("strips HTML from description before draft generation", () => {
    const listing = realviaRowToUcListing({
      ...REALVIA_SMOLKO_13303557,
      description: "Popis <b>s tagmi</b> a &amp; entitami.",
    });
    const result = generateListingDraft({ agencyId: AGENCY, listing });

    expect(result.body).not.toContain("<b>");
    expect(result.body).not.toContain("&amp;");
    expect(result.body).toContain("s tagmi");
    expect(result.guardian.verdict).toBe("pass");
  });
});
