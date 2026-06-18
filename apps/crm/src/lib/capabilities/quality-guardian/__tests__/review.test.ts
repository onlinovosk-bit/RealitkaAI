import { describe, expect, it, beforeEach } from "vitest";
import { UC_DOC_LISTING_SAMPLE } from "@/lib/uc/fixtures";
import { mapUcListingPayload } from "@/lib/uc/mapper-listing";
import { clearCapabilityAuditForTests, listCapabilityAudit } from "@/lib/capabilities/_shared/audit-log";
import {
  propertyFactsFromUcListing,
  reviewGeneratedListing,
} from "@/lib/capabilities/quality-guardian";

const AGENCY = "11111111-1111-1111-1111-111111111111";

describe("quality-guardian reviewGeneratedListing", () => {
  beforeEach(() => {
    clearCapabilityAuditForTests();
  });

  it("PASS when draft uses only real UC facts", () => {
    const mapped = mapUcListingPayload({ ...UC_DOC_LISTING_SAMPLE });
    const source = propertyFactsFromUcListing(mapped);

    const result = reviewGeneratedListing({
      agencyId: AGENCY,
      source,
      draft: {
        draftId: "draft-1",
        headline: mapped.title,
        body: `Byt ${mapped.location}, ${mapped.usableArea} m², cena ${mapped.price} EUR.`,
        claimedFacts: {
          price: mapped.price,
          usableArea: mapped.usableArea!,
          title: mapped.title,
        },
      },
    });

    expect(result.verdict).toBe("pass");
    expect(result.blockedPublish).toBe(false);
    expect(listCapabilityAudit("quality-guardian")).toHaveLength(1);
  });

  it("FLAG when claimed fact field not in source (invented)", () => {
    const mapped = mapUcListingPayload({ ...UC_DOC_LISTING_SAMPLE });
    const source = propertyFactsFromUcListing(mapped);

    const result = reviewGeneratedListing({
      agencyId: AGENCY,
      source,
      draft: {
        draftId: "draft-2",
        headline: "Luxusný penthouse",
        body: "5 izieb a bazén.",
        claimedFacts: {
          bedroomCount: 5,
        },
      },
    });

    expect(result.verdict).toBe("flag");
    expect(result.reasons.some((r) => r.startsWith("invented_fact_field:"))).toBe(true);
    expect(result.blockedPublish).toBe(true);
  });

  it("FLAG when price in body contradicts source", () => {
    const mapped = mapUcListingPayload({ ...UC_DOC_LISTING_SAMPLE });
    const source = propertyFactsFromUcListing(mapped);

    const result = reviewGeneratedListing({
      agencyId: AGENCY,
      source,
      draft: {
        draftId: "draft-3",
        headline: mapped.title,
        body: "Cena len 99999 EUR — výhodná ponuka.",
      },
    });

    expect(result.verdict).toBe("flag");
    expect(result.reasons.some((r) => r.startsWith("free_text_price_mismatch"))).toBe(true);
  });

  it("FLAG blocks publish path — missing headline", () => {
    const mapped = mapUcListingPayload({ ...UC_DOC_LISTING_SAMPLE });
    const source = propertyFactsFromUcListing(mapped);

    const result = reviewGeneratedListing({
      agencyId: AGENCY,
      source,
      draft: {
        draftId: "draft-4",
        headline: "   ",
        body: mapped.description,
      },
    });

    expect(result.verdict).toBe("flag");
    expect(result.reasons).toContain("missing_headline");
  });
});
