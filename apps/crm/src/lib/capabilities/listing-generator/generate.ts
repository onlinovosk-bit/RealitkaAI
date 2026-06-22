import type { PropertyFacts } from "@/lib/capabilities/quality-guardian/types";
import {
  reviewGeneratedListing,
  type GeneratedListingDraft,
  type GuardianReviewResult,
} from "@/lib/capabilities/quality-guardian";
import type { UcListingMapped } from "@/lib/uc/mapper-listing";
import { propertyFactsFromUcListing } from "@/lib/capabilities/quality-guardian/types";

export type ListingGeneratorInput = {
  agencyId: string;
  listing: UcListingMapped;
};

export type GeneratedListing = {
  draftId: string;
  headline: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  guardian: GuardianReviewResult;
};

function pickLangTitle(listing: UcListingMapped): string {
  const sk = listing.langData.sk?.title?.trim();
  if (sk) return sk;
  return listing.title.trim();
}

function pickLangDescription(listing: UcListingMapped): string {
  const sk = listing.langData.sk?.description?.trim();
  if (sk) return sk;
  return listing.description.trim();
}

function buildKeywords(listing: UcListingMapped): string[] {
  const parts = [listing.type, listing.rooms, listing.location].filter(Boolean);
  return [...new Set(parts.map((p) => p.trim()).filter((p) => p.length > 0))];
}

/**
 * Listing Generator — Wave 1 K2. Uses only fields present on UC listing payload.
 */
export function generateListingDraft(input: ListingGeneratorInput): GeneratedListing {
  const { agencyId, listing } = input;
  const facts: PropertyFacts = propertyFactsFromUcListing(listing);

  const headline = pickLangTitle(listing);
  const bodyParts = [
    pickLangDescription(listing),
    listing.usableArea != null ? `Úžitková plocha ${listing.usableArea} m².` : "",
    listing.price != null && listing.price > 0
      ? `Cena ${listing.price} ${listing.currency}.`
      : "",
    listing.location ? `Lokalita: ${listing.location}.` : "",
  ].filter(Boolean);

  const body = bodyParts.join("\n\n");
  const seoTitle = headline.slice(0, 60);
  const seoDescription = pickLangDescription(listing).slice(0, 160);
  const keywords = buildKeywords(listing);

  const draftId = `listing-${listing.externalId}-${Date.now()}`;

  const claimedFacts: GeneratedListingDraft["claimedFacts"] = {
    title: facts.title,
  };
  if (facts.price != null) claimedFacts.price = facts.price;
  if (facts.usableArea != null) claimedFacts.usableArea = facts.usableArea;
  if (facts.location) claimedFacts.location = facts.location;

  const guardian = reviewGeneratedListing({
    agencyId,
    source: facts,
    draft: {
      draftId,
      headline,
      body,
      seoTitle,
      seoDescription,
      claimedFacts,
    },
  });

  return {
    draftId,
    headline,
    body,
    seoTitle,
    seoDescription,
    keywords,
    guardian,
  };
}
