import { generateListingContent } from "@/lib/ai/listing-content";
import type { ListingContent, ListingPersona } from "@/lib/ai/listing-content";
import { buildVerticalPackDemo } from "@/lib/capabilities/vertical-pack-demo";
import type { RealviaPropertyRow } from "@/lib/capabilities/_shared/realvia-property-row";
import {
  reviewGeneratedListing,
  type GuardianReviewResult,
  type PropertyFacts,
} from "@/lib/capabilities/quality-guardian";
import {
  buildLaunchPackExport,
  factsToPropertyInput,
  resolveTaxonomy,
  type LaunchPackExport,
  type PropertyLaunchFacts,
  type TaxonomyConfirmation,
} from "@/lib/capabilities/property-launch-pack/facts";
import { isRealviaMappingUnknown } from "@/lib/realvia/map-taxonomy";

export type BuildPropertyLaunchPackInput = {
  agencyId: string;
  facts: PropertyLaunchFacts;
  persona?: ListingPersona;
  taxonomyConfirm?: TaxonomyConfirmation;
  /** Optional Realvia row for Wave 1 pack artefacts (banners/deck/score). */
  propertyRow?: RealviaPropertyRow;
  /** Test seam — default live Claude. */
  generate?: (
    property: Parameters<typeof generateListingContent>[0],
    persona?: ListingPersona,
  ) => Promise<{ content: ListingContent; audit: { model: string; costEur: number; latencyMs: number } }>;
};

export type PropertyLaunchPackResult = {
  exportAllowed: boolean;
  taxonomy: { type: string; transactionType: string };
  needsTypeConfirm: boolean;
  needsTxnConfirm: boolean;
  guardian: GuardianReviewResult;
  channels: ListingContent | null;
  audit: { model: string; costEur: number; latencyMs: number } | null;
  exportPayload: LaunchPackExport | null;
};

function toGuardianSource(
  facts: PropertyLaunchFacts,
  taxonomy: { type: string; transactionType: string },
): PropertyFacts {
  return {
    externalId: facts.sourceId ?? facts.propertyId ?? "manual",
    title: facts.title || `${taxonomy.type} ${facts.location}`.trim(),
    description: facts.description || facts.agent_notes || "",
    price: facts.price > 0 ? facts.price : null,
    usableArea: facts.size_m2 > 0 ? facts.size_m2 : null,
    buildingArea: null,
    plotArea: null,
    location: facts.location,
    currency: "EUR",
    rooms: facts.rooms ?? "",
    type: taxonomy.type,
    transactionType: taxonomy.transactionType,
  };
}

function sourceKey(f: PropertyLaunchFacts): string {
  return f.sourceId ?? f.propertyId ?? "manual";
}

/**
 * Property Launch Pack V0 — KF1 channels + Guardian gate (+ optional vertical pack meta).
 * No portal write. Export only when guardian passes (incl. taxonomy not Neznáme).
 */
export async function buildPropertyLaunchPack(
  input: BuildPropertyLaunchPackInput,
): Promise<PropertyLaunchPackResult> {
  const persona = input.persona ?? "GENERAL";
  const taxonomyResolved = resolveTaxonomy(input.facts, input.taxonomyConfirm);
  const taxonomy = {
    type: taxonomyResolved.type,
    transactionType: taxonomyResolved.transactionType,
  };

  const propertyInput = factsToPropertyInput(input.facts, taxonomy);
  const unknownTaxonomy =
    isRealviaMappingUnknown(taxonomy.type) || isRealviaMappingUnknown(taxonomy.transactionType);

  if (unknownTaxonomy) {
    const reasons = [
      ...(isRealviaMappingUnknown(taxonomy.type) ? ["unverified_property_type"] : []),
      ...(isRealviaMappingUnknown(taxonomy.transactionType) ? ["unverified_transaction_type"] : []),
    ];
    const guardian: GuardianReviewResult = {
      verdict: "flag",
      reasons,
      blockedPublish: true,
    };
    return {
      exportAllowed: false,
      taxonomy,
      needsTypeConfirm: taxonomyResolved.needsTypeConfirm,
      needsTxnConfirm: taxonomyResolved.needsTxnConfirm,
      guardian,
      channels: null,
      audit: null,
      exportPayload: null,
    };
  }

  const generate = input.generate ?? generateListingContent;
  const { content, audit } = await generate(propertyInput, persona);

  const source = toGuardianSource(input.facts, taxonomy);
  const claimedFacts: Record<string, string | number> = {
    title: source.title,
    location: source.location,
  };
  if (source.price != null && source.price > 0) claimedFacts.price = source.price;
  if (source.usableArea != null) claimedFacts.usableArea = source.usableArea;
  if (!isRealviaMappingUnknown(taxonomy.type)) claimedFacts.type = taxonomy.type;

  const guardian = reviewGeneratedListing({
    agencyId: input.agencyId,
    source,
    draft: {
      draftId: `launch-${sourceKey(input.facts)}-${Date.now()}`,
      headline: content.titles?.[0] ?? source.title,
      body: [content.portal_text, content.fb_ad_copy, content.email_body].join("\n\n"),
      claimedFacts,
    },
  });

  let packMeta: LaunchPackExport["packMeta"];
  if (input.propertyRow) {
    const demo = buildVerticalPackDemo({
      agencyId: input.agencyId,
      property: {
        ...input.propertyRow,
        type: taxonomy.type,
        transaction_type: taxonomy.transactionType,
      },
    });
    packMeta = {
      completenessPercent: demo.completeness.scorePercent,
      bannerCount: demo.banners.length,
      publishBlocked: true,
    };
  }

  const exportAllowed = guardian.verdict === "pass" && !guardian.blockedPublish;
  const exportPayload = exportAllowed
    ? buildLaunchPackExport({
        version: 1,
        generatedAt: new Date().toISOString(),
        source: input.facts.source,
        sourceId: input.facts.sourceId,
        propertyId: input.facts.propertyId,
        taxonomy,
        persona,
        channels: content,
        guardian: {
          verdict: guardian.verdict,
          reasons: guardian.reasons,
          blockedPublish: guardian.blockedPublish,
        },
        packMeta,
      })
    : null;

  return {
    exportAllowed,
    taxonomy,
    needsTypeConfirm: taxonomyResolved.needsTypeConfirm,
    needsTxnConfirm: taxonomyResolved.needsTxnConfirm,
    guardian,
    channels: content,
    audit,
    exportPayload,
  };
}
