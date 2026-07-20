import fs from "node:fs";
import path from "node:path";
import type { ValuationPropertyType } from "@/lib/valuation/types";

type PriceCell = {
  value: number | null;
  verified: boolean;
  source_note?: string;
};

type RegionalPricesFile = {
  meta: {
    quarter: string;
    unit: string;
  };
  band_rules: {
    type_specific: { lower_pct: number; upper_pct: number };
    region_all_fallback: { lower_pct: number; upper_pct: number };
    round_to_eur: number;
  };
  regions: Record<
    string,
    {
      label: string;
      all: PriceCell;
      byty: PriceCell;
      domy: PriceCell;
    }
  >;
};

let cached: RegionalPricesFile | null = null;

export function loadRegionalPrices(): RegionalPricesFile {
  if (cached) return cached;
  const filePath = path.resolve(process.cwd(), "../../data/regional-prices.json");
  const raw = fs.readFileSync(filePath, "utf8");
  cached = JSON.parse(raw) as RegionalPricesFile;
  return cached;
}

export function lookupVerifiedPricePerSqm(
  regionCode: string,
  propertyType: ValuationPropertyType,
): {
  pricePerSqm: number;
  bandLowerPct: number;
  bandUpperPct: number;
  regionLabel: string;
  sourceQuarter: string;
  sourceNote: string;
  usedFallback: boolean;
} | null {
  const data = loadRegionalPrices();
  const region = data.regions[regionCode] ?? data.regions.SK;
  if (!region) return null;

  const typeKey = propertyType === "byt" ? "byty" : "domy";
  const typeCell = region[typeKey];
  if (typeCell?.verified && typeCell.value != null) {
    return {
      pricePerSqm: typeCell.value,
      bandLowerPct: data.band_rules.type_specific.lower_pct,
      bandUpperPct: data.band_rules.type_specific.upper_pct,
      regionLabel: region.label,
      sourceQuarter: data.meta.quarter,
      sourceNote: typeCell.source_note ?? "NBS",
      usedFallback: false,
    };
  }

  if (region.all?.verified && region.all.value != null) {
    return {
      pricePerSqm: region.all.value,
      bandLowerPct: data.band_rules.region_all_fallback.lower_pct,
      bandUpperPct: data.band_rules.region_all_fallback.upper_pct,
      regionLabel: region.label,
      sourceQuarter: data.meta.quarter,
      sourceNote: region.all.source_note ?? "NBS region fallback",
      usedFallback: true,
    };
  }

  return null;
}

export function roundBand(value: number, roundTo: number): number {
  return Math.round(value / roundTo) * roundTo;
}
