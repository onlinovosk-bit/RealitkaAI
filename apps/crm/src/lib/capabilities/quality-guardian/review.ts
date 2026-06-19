import { appendCapabilityAudit } from "@/lib/capabilities/_shared/audit-log";
import type {
  BrandKit,
  GeneratedListingDraft,
  GuardianReviewInput,
  GuardianReviewResult,
  PropertyFacts,
} from "@/lib/capabilities/quality-guardian/types";

const CAPABILITY = "quality-guardian";

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function factKeyAllowed(key: string, source: PropertyFacts): boolean {
  return key in source;
}

function factValueMatches(
  key: string,
  claimed: string | number,
  source: PropertyFacts,
): boolean {
  const raw = source[key as keyof PropertyFacts];
  if (raw === null || raw === undefined) return false;
  if (typeof claimed === "number" && typeof raw === "number") {
    return claimed === raw;
  }
  return normalizeText(String(claimed)) === normalizeText(String(raw));
}

/** Detect numeric claims in free text that contradict source (AP-001 guard). */
function scanFreeTextFactDrift(body: string, source: PropertyFacts): string[] {
  const flags: string[] = [];

  if (source.price != null) {
    const amounts = [...body.matchAll(/\b(\d{3,7})\s*(€|EUR)/gi)];
    for (const m of amounts) {
      const n = Number(m[1]);
      if (!Number.isNaN(n) && n !== source.price) {
        flags.push(`free_text_price_mismatch:${n}`);
      }
    }
  }

  if (source.usableArea != null) {
    const areaMatch = body.match(/(\d+(?:[.,]\d+)?)\s*m²/i);
    if (areaMatch) {
      const claimed = Number(areaMatch[1].replace(",", "."));
      if (!Number.isNaN(claimed) && claimed !== source.usableArea) {
        flags.push(`free_text_area_mismatch:${claimed}`);
      }
    }
  }

  return flags;
}

function validateBrandKit(brandKit: BrandKit | undefined, draft: GeneratedListingDraft): string[] {
  if (!brandKit?.primaryColor) return [];
  if (draft.body.includes("#000000") && brandKit.primaryColor !== "#000000") {
    return ["brand_color_off_palette"];
  }
  return [];
}

function validateRequiredCopy(draft: GeneratedListingDraft): string[] {
  const reasons: string[] = [];
  if (!normalizeText(draft.headline)) reasons.push("missing_headline");
  if (!normalizeText(draft.body)) reasons.push("missing_body");
  return reasons;
}

/**
 * Quality/Brand Guardian — PASS only when draft claims ⊆ source facts.
 * FLAG blocks publish until human fixes or regenerates.
 */
export function reviewGeneratedListing(input: GuardianReviewInput): GuardianReviewResult {
  const reasons: string[] = [
    ...validateRequiredCopy(input.draft),
    ...validateBrandKit(input.brandKit, input.draft),
  ];

  const claimed = input.draft.claimedFacts ?? {};
  for (const [key, value] of Object.entries(claimed)) {
    if (!factKeyAllowed(key, input.source)) {
      reasons.push(`invented_fact_field:${key}`);
      continue;
    }
    if (!factValueMatches(key, value, input.source)) {
      reasons.push(`fact_mismatch:${key}`);
    }
  }

  reasons.push(...scanFreeTextFactDrift(input.draft.body, input.source));

  const verdict = reasons.length === 0 ? "pass" : "flag";
  const result: GuardianReviewResult = {
    verdict,
    reasons,
    blockedPublish: verdict === "flag",
  };

  appendCapabilityAudit({
    capability: CAPABILITY,
    action: "review_listing_draft",
    agencyId: input.agencyId,
    entityId: input.source.externalId,
    result: verdict === "pass" ? "pass" : "flag",
    detail: reasons.join("; ") || "ok",
  });

  return result;
}
