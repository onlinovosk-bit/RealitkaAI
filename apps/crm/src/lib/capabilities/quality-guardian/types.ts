import type { UcListingMapped } from "@/lib/uc/mapper-listing";

/** Factual fields allowed in generated copy — derived from UC/property, never invented. */
export type PropertyFacts = {
  externalId: string;
  title: string;
  description: string;
  price: number | null;
  usableArea: number | null;
  location: string;
  currency: string;
  rooms: string;
};

export type GeneratedListingDraft = {
  draftId: string;
  headline: string;
  body: string;
  seoTitle?: string;
  seoDescription?: string;
  /** Explicit numeric/text claims the generator asserts — each must match PropertyFacts. */
  claimedFacts?: Record<string, string | number>;
};

export type GuardianVerdict = "pass" | "flag";

export type GuardianReviewResult = {
  verdict: GuardianVerdict;
  reasons: string[];
  blockedPublish: boolean;
};

export type GuardianReviewInput = {
  agencyId: string;
  source: PropertyFacts;
  draft: GeneratedListingDraft;
  brandKit?: BrandKit;
};

export type BrandKit = {
  primaryColor?: string;
  logoUrl?: string;
  tone?: "professional" | "friendly";
};

export function propertyFactsFromUcListing(mapped: UcListingMapped): PropertyFacts {
  return {
    externalId: mapped.externalId,
    title: mapped.title,
    description: mapped.description,
    price: mapped.price,
    usableArea: mapped.usableArea,
    location: mapped.location,
    currency: mapped.currency,
    rooms: mapped.rooms,
  };
}
