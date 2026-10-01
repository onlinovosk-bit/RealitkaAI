import { appendCapabilityAudit } from "@/lib/capabilities/_shared/audit-log";
import { realviaRowToUcListing } from "@/lib/capabilities/_shared/realvia-property-row";
import type { RealviaPropertyRow } from "@/lib/capabilities/_shared/realvia-property-row";
import { generateListingDraft } from "@/lib/capabilities/listing-generator";

const CAPABILITY = "presentation-builder";

export type PresentationSlide = {
  title: string;
  bullets: string[];
};

export type PresentationDeck = {
  draftId: string;
  sourceId: string;
  audience: "owner" | "buyer";
  slides: PresentationSlide[];
  guardianPass: boolean;
};

export function buildPresentationDeck(input: {
  agencyId: string;
  property: RealviaPropertyRow;
  audience: "owner" | "buyer";
}): PresentationDeck {
  const listing = realviaRowToUcListing(input.property);
  const generated = generateListingDraft({ agencyId: input.agencyId, listing });
  const draftId = `deck-${input.audience}-${input.property.source_id}`;

  const facts: string[] = [];
  if (listing.usableArea != null) facts.push(`Úžitková plocha ${listing.usableArea} m²`);
  if (listing.plotArea != null) facts.push(`Pozemok ${listing.plotArea} m²`);
  if (listing.price != null && listing.price > 0) facts.push(`Cena ${listing.price} ${listing.currency}`);
  if (listing.location) facts.push(`Lokalita: ${listing.location}`);

  const slides: PresentationSlide[] =
    input.audience === "owner"
      ? [
          { title: "Prehľad pre majiteľa", bullets: [generated.headline, ...facts] },
          { title: "Popis", bullets: generated.body.split("\n\n").filter(Boolean).slice(0, 5) },
          { title: "Kontakt makléra", bullets: [listing.brokerName, listing.brokerPhone, listing.brokerEmail].filter(Boolean) as string[] },
        ]
      : [
          { title: "Pre kupujúceho", bullets: [generated.headline, generated.seoDescription] },
          { title: "Kľúčové parametre", bullets: facts.length ? facts : ["Parametre doplní maklér z inzerátu"] },
          { title: "Ďalší krok", bullets: ["Obhliadka po dohode", listing.brokerPhone ?? "Kontakt v kancelárii"] },
        ];

  appendCapabilityAudit({
    capability: CAPABILITY,
    action: `deck_${input.audience}`,
    agencyId: input.agencyId,
    entityId: input.property.source_id,
    result: generated.guardian.verdict === "pass" ? "pass" : "flag",
    detail: generated.guardian.reasons.join("; ") || "ok",
  });

  return {
    draftId,
    sourceId: input.property.source_id,
    audience: input.audience,
    slides,
    guardianPass: generated.guardian.verdict === "pass",
  };
}
