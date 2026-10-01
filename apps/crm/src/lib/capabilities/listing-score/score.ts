import { appendCapabilityAudit } from "@/lib/capabilities/_shared/audit-log";
import { stripHtmlToPlainText } from "@/lib/capabilities/_shared/strip-html";
import { realviaRowToUcListing } from "@/lib/capabilities/_shared/realvia-property-row";
import type { RealviaPropertyRow } from "@/lib/capabilities/_shared/realvia-property-row";
import {
  propertyFactsFromUcListing,
  reviewGeneratedListing,
  type GuardianReviewResult,
} from "@/lib/capabilities/quality-guardian";

const CAPABILITY = "listing-score";

export type CompletenessFieldKey =
  | "photos"
  | "video"
  | "virtual_tour"
  | "description"
  | "price"
  | "gps"
  | "energy_cert"
  | "category"
  | "location";

export type CompletenessField = {
  key: CompletenessFieldKey;
  label: string;
  present: boolean;
  detail: string;
};

export type ListingCompletenessScore = {
  sourceId: string;
  scorePercent: number;
  filledCount: number;
  totalCount: number;
  missing: string[];
  fields: CompletenessField[];
  summary: string;
  guardian: GuardianReviewResult;
};

const MIN_DESCRIPTION_LENGTH = 40;

function advertPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  const advert = root.advert;
  if (advert && typeof advert === "object") return advert as Record<string, unknown>;
  return null;
}

function hasVideoOrTour(advert: Record<string, unknown> | null, kind: "video" | "virtual_tour"): boolean {
  if (!advert) return false;
  const needles =
    kind === "video"
      ? ["video", "youtube", "vimeo", "video_url"]
      : ["virtual_tour", "virtualTour", "matterport", "3d_tour", "panorama"];

  const stack: unknown[] = [advert];
  while (stack.length) {
    const cur = stack.pop();
    if (cur == null) continue;
    if (typeof cur === "string") {
      const lower = cur.toLowerCase();
      if (needles.some((n) => lower.includes(n))) return true;
      continue;
    }
    if (Array.isArray(cur)) {
      stack.push(...cur);
      continue;
    }
    if (typeof cur === "object") {
      for (const [k, v] of Object.entries(cur as Record<string, unknown>)) {
        const keyLower = k.toLowerCase();
        if (needles.some((n) => keyLower.includes(n))) {
          if (typeof v === "string" && v.trim()) return true;
          if (typeof v === "number" && v > 0) return true;
          if (v === true) return true;
        }
        stack.push(v);
      }
    }
  }
  return false;
}

function readGps(
  row: RealviaPropertyRow,
  advert: Record<string, unknown> | null,
): { lat: number | null; lon: number | null } {
  if (row.latitude != null && row.longitude != null) {
    return { lat: row.latitude, lon: row.longitude };
  }

  const geo = advert?.geo_point ?? advert?.geoPoint ?? advert?.location;
  if (geo && typeof geo === "object") {
    const g = geo as Record<string, unknown>;
    const lat = typeof g.lat === "number" ? g.lat : typeof g.latitude === "number" ? g.latitude : null;
    const lon =
      typeof g.lon === "number"
        ? g.lon
        : typeof g.lng === "number"
          ? g.lng
          : typeof g.longitude === "number"
            ? g.longitude
            : null;
    return { lat, lon };
  }
  return { lat: null, lon: null };
}

function buildFields(row: RealviaPropertyRow): CompletenessField[] {
  const listing = realviaRowToUcListing(row);
  const advert = advertPayload(row.payload_raw);
  const photoCount = listing.images.length;
  const description = stripHtmlToPlainText(String(row.description ?? listing.description ?? ""));
  const price = row.price ?? listing.price ?? null;
  const { lat, lon } = readGps(row, advert);
  const energyCert = advert?.building_energy_rating_certificate;
  const hasEnergyCert =
    typeof energyCert === "number" ? energyCert > 0 : typeof energyCert === "string" && energyCert.trim() !== "";

  return [
    {
      key: "photos",
      label: "Fotky",
      present: photoCount >= 1,
      detail: photoCount >= 1 ? `${photoCount} fotiek` : "žiadne fotky",
    },
    {
      key: "video",
      label: "Video",
      present: hasVideoOrTour(advert, "video"),
      detail: hasVideoOrTour(advert, "video") ? "video v payload" : "chýba video",
    },
    {
      key: "virtual_tour",
      label: "Virtuálna prehliadka",
      present: hasVideoOrTour(advert, "virtual_tour"),
      detail: hasVideoOrTour(advert, "virtual_tour") ? "virtuálna prehliadka v payload" : "chýba virtuálna prehliadka",
    },
    {
      key: "description",
      label: "Popis",
      present: description.length >= MIN_DESCRIPTION_LENGTH,
      detail:
        description.length >= MIN_DESCRIPTION_LENGTH
          ? `${description.length} znakov`
          : `krátky popis (${description.length} znakov)`,
    },
    {
      key: "price",
      label: "Cena",
      present: price != null && price > 0,
      detail: price != null && price > 0 ? `${price} ${row.currency ?? "EUR"}` : "0 alebo chýbajúca cena",
    },
    {
      key: "gps",
      label: "GPS",
      present: lat != null && lon != null,
      detail: lat != null && lon != null ? `${lat}, ${lon}` : "chýba GPS",
    },
    {
      key: "energy_cert",
      label: "Energetický certifikát",
      present: hasEnergyCert,
      detail: hasEnergyCert ? "certifikát v payload" : "chýba energetický certifikát",
    },
    {
      key: "category",
      label: "Kategória",
      present: Boolean(String(row.type ?? listing.type ?? "").trim()),
      detail: String(row.type ?? listing.type ?? "").trim() || "chýba kategória",
    },
    {
      key: "location",
      label: "Lokalita",
      present: Boolean(String(row.location ?? listing.location ?? "").trim()),
      detail: String(row.location ?? listing.location ?? "").trim() || "chýba lokalita",
    },
  ];
}

/**
 * Property completeness score — only counts fields present on the real property row / payload_raw.
 */
export function scoreListingCompleteness(input: {
  agencyId: string;
  property: RealviaPropertyRow;
}): ListingCompletenessScore {
  const fields = buildFields(input.property);
  const filledCount = fields.filter((f) => f.present).length;
  const totalCount = fields.length;
  const scorePercent = totalCount === 0 ? 0 : Math.round((filledCount / totalCount) * 100);
  const missing = fields.filter((f) => !f.present).map((f) => f.label.toLowerCase());

  const listing = realviaRowToUcListing(input.property);
  const facts = propertyFactsFromUcListing(listing);
  const missingLine = missing.length ? `Chýba: ${missing.join(", ")}.` : "Všetky sledované polia sú vyplnené.";
  const summary = `Úplnosť ${scorePercent}% (${filledCount}/${totalCount}). ${missingLine}`;

  const claimedFacts: Record<string, string | number> = { title: facts.title };
  if (facts.price != null && facts.price > 0) claimedFacts.price = facts.price;
  if (facts.usableArea != null) claimedFacts.usableArea = facts.usableArea;
  if (facts.location) claimedFacts.location = facts.location;

  const guardian = reviewGeneratedListing({
    agencyId: input.agencyId,
    source: facts,
    draft: {
      draftId: `listing-score-${input.property.source_id}`,
      headline: `Úplnosť ${scorePercent}%`,
      body: summary,
      claimedFacts,
    },
  });

  appendCapabilityAudit({
    capability: CAPABILITY,
    action: "score_completeness",
    agencyId: input.agencyId,
    entityId: input.property.source_id,
    result: guardian.verdict === "pass" ? "pass" : "flag",
    detail: summary,
  });

  return {
    sourceId: input.property.source_id,
    scorePercent,
    filledCount,
    totalCount,
    missing,
    fields,
    summary,
    guardian,
  };
}
