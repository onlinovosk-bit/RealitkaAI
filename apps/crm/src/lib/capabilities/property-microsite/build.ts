import { appendCapabilityAudit } from "@/lib/capabilities/_shared/audit-log";
import { assertPublishAllowed } from "@/lib/capabilities/_shared/human-approval";
import { realviaRowToUcListing } from "@/lib/capabilities/_shared/realvia-property-row";
import type { RealviaPropertyRow } from "@/lib/capabilities/_shared/realvia-property-row";
import { generateListingDraft } from "@/lib/capabilities/listing-generator";
import { reviewGeneratedListing, propertyFactsFromUcListing } from "@/lib/capabilities/quality-guardian";

const CAPABILITY = "property-microsite";

export type MicrositeSpec = {
  draftId: string;
  propertyId: string;
  sourceId: string;
  noindex: boolean;
  heroTitle: string;
  heroSubtitle: string;
  body: string;
  imageUrls: string[];
  broker: { name: string | null; email: string | null; phone: string | null };
  guardianPass: boolean;
  publishBlocked: boolean;
};

export function buildPropertyMicrosite(input: {
  agencyId: string;
  property: RealviaPropertyRow;
  humanApproved?: boolean;
}): MicrositeSpec {
  const listing = realviaRowToUcListing(input.property);
  const generated = generateListingDraft({ agencyId: input.agencyId, listing });
  const draftId = `microsite-${input.property.source_id}`;

  const guardianOk = generated.guardian.verdict === "pass";
  const publishGate = input.humanApproved
    ? assertPublishAllowed(CAPABILITY, draftId)
    : { ok: false as const, reason: "human_approval_missing" };

  const imageUrls = listing.images.map((i) => i.url).filter(Boolean);

  appendCapabilityAudit({
    capability: CAPABILITY,
    action: "build_microsite",
    agencyId: input.agencyId,
    entityId: input.property.source_id,
    result: guardianOk ? "pass" : "flag",
    detail: generated.guardian.reasons.join("; ") || "ok",
  });

  return {
    draftId,
    propertyId: input.property.id,
    sourceId: input.property.source_id,
    noindex: !(guardianOk && publishGate.ok),
    heroTitle: generated.headline,
    heroSubtitle: listing.location,
    body: generated.body,
    imageUrls,
    broker: {
      name: listing.brokerName,
      email: listing.brokerEmail,
      phone: listing.brokerPhone,
    },
    guardianPass: guardianOk,
    publishBlocked: !guardianOk || !publishGate.ok,
  };
}

/** Re-run guardian on microsite copy (brand QA hook). */
export function micrositeGuardianCheck(
  agencyId: string,
  property: RealviaPropertyRow,
  headline: string,
  body: string,
) {
  const listing = realviaRowToUcListing(property);
  const facts = propertyFactsFromUcListing(listing);
  return reviewGeneratedListing({
    agencyId,
    source: facts,
    draft: {
      draftId: `microsite-check-${property.source_id}`,
      headline,
      body,
      claimedFacts: { title: facts.title },
    },
  });
}
