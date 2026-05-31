import { parseBazosRSS } from "@/lib/arbitrage/parsers/bazos-parser";
import { normalizeRegion } from "@/lib/stealth-recruiter/scan-filters";
import type { PortalListing } from "@/types/arbitrage";

export type StealthProspectUpsertRow = {
  agency_id: string;
  address: string;
  region: string;
  platform: string;
  days_listed: number;
  original_price: number;
  current_price: number;
  score: number;
  status: "verified";
  verified_at: string;
  scraped_at: string;
};

export type IngestPresovResult = {
  region: string;
  source: "bazos_sk";
  prospects: StealthProspectUpsertRow[];
  errors: string[];
  scanned_at: string;
};

const PRESOV_CITY_HINTS = [
  "prešov",
  "presov",
  "poprad",
  "humenné",
  "humenne",
  "bardejov",
  "sabinov",
  "stará ľubovňa",
  "stara lubovna",
  "kežmarok",
  "kezmarok",
  "levoca",
  "levoča",
];

/** Days since RSS pubDate (RFC 2822). */
export function daysListedFromPubDate(pubDate: string, ref = new Date()): number {
  const published = new Date(pubDate);
  if (Number.isNaN(published.getTime())) return 0;
  const ms = ref.getTime() - published.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export function formatProspectAddress(
  title: string,
  location?: string | null,
): string {
  const t = title.trim();
  const loc = String(location ?? "").trim();
  if (!loc) return t;
  if (t.toLowerCase().includes(loc.toLowerCase())) return t;
  return `${t}, ${loc}`;
}

/** Heuristic score for self-seller recruitment (0–99). */
export function computeStealthScore(params: {
  daysListed: number;
  currentPrice: number;
  title: string;
  description?: string | null;
}): number {
  let score = 52;
  const text = `${params.title} ${params.description ?? ""}`;

  if (params.daysListed >= 120) score += 28;
  else if (params.daysListed >= 90) score += 22;
  else if (params.daysListed >= 60) score += 14;
  else if (params.daysListed >= 30) score += 8;

  if (/zníž|zniz|pôvodn|povodn|bola cena|zľava|zlava/i.test(text)) score += 12;
  if (/samostatn|vlastník|vlastnik|bez RK|bez rk|súkromn|sukromn/i.test(text)) score += 6;

  if (params.currentPrice > 0) {
    if (params.currentPrice >= 40_000 && params.currentPrice <= 350_000) score += 5;
    else if (params.currentPrice > 350_000) score -= 4;
  }

  return Math.min(99, Math.max(0, Math.round(score)));
}

export function listingMatchesPresovArea(
  listing: Partial<PortalListing>,
  region: string,
): boolean {
  const target = normalizeRegion(region);
  if (!target) return true;

  const haystack = [
    listing.city,
    listing.location_raw,
    listing.title,
    listing.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (target.localeCompare("Prešov", "sk", { sensitivity: "base" }) === 0) {
    return PRESOV_CITY_HINTS.some((hint) => haystack.includes(hint));
  }

  return haystack.includes(target.toLowerCase());
}

export function mapListingToStealthProspect(
  listing: Partial<PortalListing>,
  agencyId: string,
  region: string,
  ref = new Date(),
): StealthProspectUpsertRow | null {
  const price = listing.price ?? 0;
  if (!price || price <= 0) return null;

  if (listing.seller_type === "agency") return null;

  const daysListed = listing.first_seen_at
    ? daysListedFromPubDate(listing.first_seen_at, ref)
    : 0;

  const address = formatProspectAddress(
    listing.title ?? "Neznáma adresa",
    listing.location_raw ?? listing.city,
  );

  const now = ref.toISOString();

  return {
    agency_id: agencyId,
    address,
    region,
    platform: "bazos",
    days_listed: daysListed,
    original_price: price,
    current_price: price,
    score: computeStealthScore({
      daysListed,
      currentPrice: price,
      title: listing.title ?? "",
      description: listing.description,
    }),
    status: "verified",
    verified_at: now,
    scraped_at: now,
  };
}

export function buildProspectsFromListings(
  listings: Partial<PortalListing>[],
  agencyId: string,
  region: string,
  ref = new Date(),
): StealthProspectUpsertRow[] {
  const normalizedRegion = normalizeRegion(region) ?? "Prešov";
  const seen = new Set<string>();
  const rows: StealthProspectUpsertRow[] = [];

  for (const listing of listings) {
    if (!listingMatchesPresovArea(listing, normalizedRegion)) continue;
    const row = mapListingToStealthProspect(
      listing,
      agencyId,
      normalizedRegion,
      ref,
    );
    if (!row) continue;
    const key = row.address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }

  return rows;
}

/** Fetch Bazoš RSS for Prešov kraj and map to upsert-ready rows. */
export async function ingestPresovProspects(
  agencyId: string,
  region = "Prešov",
  signal?: AbortSignal,
): Promise<IngestPresovResult> {
  const normalizedRegion = normalizeRegion(region) ?? "Prešov";
  const parseResult = await parseBazosRSS(normalizedRegion, "presov", signal);

  const prospects = buildProspectsFromListings(
    parseResult.listings,
    agencyId,
    normalizedRegion,
  );

  return {
    region: normalizedRegion,
    source: "bazos_sk",
    prospects,
    errors: parseResult.errors,
    scanned_at: parseResult.scanned_at,
  };
}
