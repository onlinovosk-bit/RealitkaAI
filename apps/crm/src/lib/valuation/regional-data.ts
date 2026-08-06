import fs from "node:fs";
import path from "node:path";
import type { ValuationPropertyType } from "@/lib/valuation/types";
import type {
  PriceSource,
  ResolvedLocation,
} from "@/lib/valuation/resolve-region";

type PriceCell = {
  value: number | null;
  verified: boolean;
  source_note?: string;
  source?: string;
  period?: string;
  priceType?: string;
  segment?: string;
};

type RegionEntry = {
  label: string;
  all: PriceCell;
  byty: PriceCell;
  domy: PriceCell;
};

type RegionalPricesFile = {
  meta: {
    quarter: string;
    unit: string;
  };
  band_rules: {
    type_specific: { lower_pct: number; upper_pct: number };
    region_all_fallback: { lower_pct: number; upper_pct: number };
    national_type_fallback?: { lower_pct: number; upper_pct: number };
    round_to_eur: number;
  };
  regions: Record<string, RegionEntry>;
  cities?: Record<string, RegionEntry>;
};

export type PriceLookupResult = {
  pricePerSqm: number;
  bandLowerPct: number;
  bandUpperPct: number;
  regionLabel: string;
  sourceQuarter: string;
  sourceNote: string;
  usedFallback: boolean;
  priceSource: Exclude<PriceSource, "none">;
};

let cached: RegionalPricesFile | null = null;

export function loadRegionalPrices(): RegionalPricesFile {
  if (cached) return cached;
  const filePath = path.resolve(process.cwd(), "../../data/regional-prices.json");
  const raw = fs.readFileSync(filePath, "utf8");
  cached = JSON.parse(raw) as RegionalPricesFile;
  return cached;
}

/** Test helper — clears module cache after fixture swaps. */
export function clearRegionalPricesCache(): void {
  cached = null;
}

function cellSourceNote(cell: PriceCell, fallback: string): string {
  return cell.source_note ?? cell.source ?? fallback;
}

function lookupCity(
  data: RegionalPricesFile,
  cityKey: string,
  propertyType: ValuationPropertyType,
  regionLabel: string,
): PriceLookupResult | null {
  const city = data.cities?.[cityKey];
  if (!city) return null;

  const typeKey = propertyType === "byt" ? "byty" : "domy";
  const typeCell = city[typeKey];
  if (typeCell?.verified && typeCell.value != null) {
    return {
      pricePerSqm: typeCell.value,
      bandLowerPct: data.band_rules.type_specific.lower_pct,
      bandUpperPct: data.band_rules.type_specific.upper_pct,
      regionLabel: city.label || regionLabel,
      sourceQuarter: typeCell.period ?? data.meta.quarter,
      sourceNote: cellSourceNote(typeCell, "city anchor"),
      usedFallback: false,
      priceSource: "city",
    };
  }

  return null;
}

/**
 * Resolve verified €/m² for a location match.
 * @param regionOrResolved — region code string (legacy) or ResolvedLocation from resolveRegionFromLocation
 */
export function lookupVerifiedPricePerSqm(
  regionOrResolved: string | ResolvedLocation,
  propertyType: ValuationPropertyType,
): PriceLookupResult | null {
  const data = loadRegionalPrices();
  const resolved: ResolvedLocation =
    typeof regionOrResolved === "string"
      ? {
          regionCode: regionOrResolved,
          regionLabel:
            data.regions[regionOrResolved]?.label ??
            data.cities?.[regionOrResolved]?.label ??
            regionOrResolved,
          matchKind:
            data.cities?.[regionOrResolved]
              ? "city"
              : regionOrResolved === "SK"
                ? "national"
                : "region",
        }
      : regionOrResolved;

  const isCityKey =
    resolved.matchKind === "city" || Boolean(data.cities?.[resolved.regionCode]);

  if (isCityKey) {
    const cityHit = lookupCity(
      data,
      resolved.regionCode,
      propertyType,
      resolved.regionLabel,
    );
    if (cityHit) return cityHit;
    // City known but no verified cell for this property type → national type avg
    return lookupNationalType(data, propertyType, resolved.regionLabel);
  }

  const region = data.regions[resolved.regionCode] ?? data.regions.SK;
  if (!region) return null;

  const typeKey = propertyType === "byt" ? "byty" : "domy";
  const typeCell = region[typeKey];
  if (typeCell?.verified && typeCell.value != null) {
    const isNational =
      resolved.regionCode === "SK" || resolved.matchKind === "national";
    const bands = isNational
      ? (data.band_rules.national_type_fallback ?? data.band_rules.type_specific)
      : data.band_rules.type_specific;
    return {
      pricePerSqm: typeCell.value,
      bandLowerPct: bands.lower_pct,
      bandUpperPct: bands.upper_pct,
      regionLabel: region.label,
      sourceQuarter: data.meta.quarter,
      sourceNote: cellSourceNote(typeCell, "NBS"),
      usedFallback: false,
      priceSource: isNational ? "national" : "region",
    };
  }

  if (resolved.regionCode !== "SK") {
    const nationalHit = lookupNationalType(
      data,
      propertyType,
      `${region.label} (NBS ${propertyType === "byt" ? "byty" : "domy"} SK)`,
    );
    if (nationalHit) {
      return { ...nationalHit, usedFallback: true };
    }
  }

  if (region.all?.verified && region.all.value != null) {
    return {
      pricePerSqm: region.all.value,
      bandLowerPct: data.band_rules.region_all_fallback.lower_pct,
      bandUpperPct: data.band_rules.region_all_fallback.upper_pct,
      regionLabel: region.label,
      sourceQuarter: data.meta.quarter,
      sourceNote: cellSourceNote(region.all, "NBS region fallback"),
      usedFallback: true,
      priceSource: "region",
    };
  }

  return null;
}

function lookupNationalType(
  data: RegionalPricesFile,
  propertyType: ValuationPropertyType,
  regionLabel: string,
): PriceLookupResult | null {
  const typeKey = propertyType === "byt" ? "byty" : "domy";
  const nationalType = data.regions.SK?.[typeKey];
  const nationalBands =
    data.band_rules.national_type_fallback ?? data.band_rules.type_specific;
  if (!nationalType?.verified || nationalType.value == null) return null;
  return {
    pricePerSqm: nationalType.value,
    bandLowerPct: nationalBands.lower_pct,
    bandUpperPct: nationalBands.upper_pct,
    regionLabel,
    sourceQuarter: data.meta.quarter,
    sourceNote: cellSourceNote(nationalType, "NBS celoštátny typový priemer"),
    usedFallback: true,
    priceSource: "national",
  };
}

export function roundBand(value: number, roundTo: number): number {
  return Math.round(value / roundTo) * roundTo;
}

export function estimateBandSpreadPct(low: number, high: number): number {
  const mid = (low + high) / 2;
  if (mid <= 0) return 0;
  return Math.round(((high - low) / mid) * 100);
}
