import { realviaRowToUcListing } from "@/lib/capabilities/_shared/realvia-property-row";
import type { RealviaPropertyRow } from "@/lib/capabilities/_shared/realvia-property-row";
import { buildBannerSpecs } from "@/lib/capabilities/banner-factory";
import type { BannerSpec } from "@/lib/capabilities/banner-factory";
import { scoreListingCompleteness } from "@/lib/capabilities/listing-score";
import type { ListingCompletenessScore } from "@/lib/capabilities/listing-score";
import { generateListingDraft } from "@/lib/capabilities/listing-generator";
import type { GeneratedListing } from "@/lib/capabilities/listing-generator";
import { buildPresentationDeck } from "@/lib/capabilities/presentation-builder";
import type { PresentationDeck } from "@/lib/capabilities/presentation-builder";
import { buildPropertyMicrosite } from "@/lib/capabilities/property-microsite";
import type { MicrositeSpec } from "@/lib/capabilities/property-microsite";

export type VerticalPackDemo = {
  sourceId: string;
  propertyTitle: string;
  listing: GeneratedListing;
  banners: BannerSpec[];
  deckOwner: PresentationDeck;
  deckBuyer: PresentationDeck;
  microsite: MicrositeSpec;
  completeness: ListingCompletenessScore;
};

/** K4 demo — aggregates Wave 1 capabilities for one real property row. */
export function buildVerticalPackDemo(input: {
  agencyId: string;
  property: RealviaPropertyRow;
}): VerticalPackDemo {
  const listing = generateListingDraft({
    agencyId: input.agencyId,
    listing: realviaRowToUcListing(input.property),
  });

  return {
    sourceId: input.property.source_id,
    propertyTitle: input.property.title,
    listing,
    banners: buildBannerSpecs({
      agencyId: input.agencyId,
      property: input.property,
      brandKit: { primaryColor: "#1e3a5f", tone: "professional" },
      states: ["for_sale", "reduced"],
    }),
    deckOwner: buildPresentationDeck({
      agencyId: input.agencyId,
      property: input.property,
      audience: "owner",
    }),
    deckBuyer: buildPresentationDeck({
      agencyId: input.agencyId,
      property: input.property,
      audience: "buyer",
    }),
    microsite: buildPropertyMicrosite({
      agencyId: input.agencyId,
      property: input.property,
    }),
    completeness: scoreListingCompleteness({
      agencyId: input.agencyId,
      property: input.property,
    }),
  };
}
