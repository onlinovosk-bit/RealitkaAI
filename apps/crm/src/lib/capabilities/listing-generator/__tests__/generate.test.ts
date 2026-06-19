import { describe, expect, it } from "vitest";
import { UC_DOC_LISTING_SAMPLE } from "@/lib/uc/fixtures";
import { mapUcListingPayload } from "@/lib/uc/mapper-listing";
import { generateListingDraft } from "@/lib/capabilities/listing-generator";

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
});
