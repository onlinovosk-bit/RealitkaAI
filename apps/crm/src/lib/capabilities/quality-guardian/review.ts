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

function parseAreaM2Token(raw: string): number | null {
  const token = raw.trim();
  if (!token) return null;
  // European thousands: 4.500 or 4,500 → 4500
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(token)) {
    const n = Number(token.replace(/[.,]/g, ""));
    return Number.isNaN(n) ? null : n;
  }
  const n = Number(token.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

function collectAllowedAreas(source: PropertyFacts): Set<number> {
  const allowed = new Set<number>();
  for (const value of [source.usableArea, source.buildingArea, source.plotArea]) {
    if (value != null && !Number.isNaN(value)) allowed.add(value);
  }
  for (const m of source.description.matchAll(/(\d+(?:[.,]\d+)?)\s*m²/gi)) {
    const n = parseAreaM2Token(m[1] ?? "");
    if (n != null) allowed.add(n);
  }
  return allowed;
}

/** Detect numeric claims in free text that contradict source (AP-001 guard). */
function scanFreeTextFactDrift(body: string, source: PropertyFacts): string[] {
  const flags: string[] = [];

  if (source.price != null && source.price > 0) {
    const amounts = [...body.matchAll(/\b(\d{3,7})\s*(€|EUR)/gi)];
    for (const m of amounts) {
      const n = Number(m[1]);
      if (!Number.isNaN(n) && n !== source.price) {
        flags.push(`free_text_price_mismatch:${n}`);
      }
    }
  }

  const allowedAreas = collectAllowedAreas(source);
  if (allowedAreas.size > 0) {
    for (const m of body.matchAll(/(\d+(?:[.,]\d+)?)\s*m²/gi)) {
      const claimed = parseAreaM2Token(m[1] ?? "");
      if (claimed != null && !allowedAreas.has(claimed)) {
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
