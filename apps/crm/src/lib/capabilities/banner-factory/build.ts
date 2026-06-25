import { appendCapabilityAudit } from "@/lib/capabilities/_shared/audit-log";
import { realviaRowToUcListing } from "@/lib/capabilities/_shared/realvia-property-row";
import type { RealviaPropertyRow } from "@/lib/capabilities/_shared/realvia-property-row";
import type { BrandKit } from "@/lib/capabilities/quality-guardian/types";
import { reviewGeneratedListing, propertyFactsFromUcListing } from "@/lib/capabilities/quality-guardian";

const CAPABILITY = "banner-factory";

export type BannerState = "for_sale" | "reduced" | "sold" | "reserved";

export type BannerSpec = {
  state: BannerState;
  headline: string;
  subline: string;
  primaryColor: string;
  guardianPass: boolean;
};

export const BANNER_STATE_LABELS: Record<BannerState, string> = {
  for_sale: "Na predaj",
  reduced: "Znížená cena",
  sold: "Predané",
  reserved: "Rezervované",
};

const STATE_LABELS = BANNER_STATE_LABELS;

export function buildBannerSpecs(input: {
  agencyId: string;
  property: RealviaPropertyRow;
  brandKit?: BrandKit;
  states?: BannerState[];
}): BannerSpec[] {
  const listing = realviaRowToUcListing(input.property);
  const facts = propertyFactsFromUcListing(listing);
  const states = input.states ?? ["for_sale", "reduced", "sold", "reserved"];
  const primaryColor = input.brandKit?.primaryColor ?? "#1e3a5f";

  return states.map((state) => {
    const headline = `${STATE_LABELS[state]} — ${listing.title}`;
    const pricePart =
      facts.price != null && facts.price > 0 ? `${facts.price} ${facts.currency}` : "";
    const subline = [listing.location, pricePart].filter(Boolean).join(" · ");

    const guardian = reviewGeneratedListing({
      agencyId: input.agencyId,
      source: facts,
      draft: {
        draftId: `banner-${state}-${input.property.source_id}`,
        headline,
        body: subline,
        claimedFacts: facts.price != null && facts.price > 0 ? { title: facts.title, price: facts.price } : { title: facts.title },
      },
      brandKit: input.brandKit,
    });

    appendCapabilityAudit({
      capability: CAPABILITY,
      action: `banner_${state}`,
      agencyId: input.agencyId,
      entityId: input.property.source_id,
      result: guardian.verdict === "pass" ? "pass" : "flag",
      detail: guardian.reasons.join("; ") || "ok",
    });

    return {
      state,
      headline,
      subline,
      primaryColor,
      guardianPass: guardian.verdict === "pass",
    };
  });
}
