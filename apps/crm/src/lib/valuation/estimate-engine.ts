import { resolveRegionFromLocation } from "@/lib/valuation/resolve-region";
import {
  loadRegionalPrices,
  lookupVerifiedPricePerSqm,
  roundBand,
} from "@/lib/valuation/regional-data";
import type {
  ValuationEstimateResult,
  ValuationPropertyInput,
} from "@/lib/valuation/types";

const DISCLAIMER =
  "Informatívny odhad na základe verejných štatistík NBS — nie znalecký posudok. Presnú cenu pripraví maklér po obhliadke.";

export function buildDeterministicEstimate(
  input: ValuationPropertyInput,
): ValuationEstimateResult {
  const sqm = Math.max(1, Math.min(10_000, Math.round(input.sqm)));
  const { regionCode } = resolveRegionFromLocation(input.location);
  const lookup = lookupVerifiedPricePerSqm(regionCode, input.propertyType);

  if (!lookup) {
    return {
      noEstimate: true,
      currency: "EUR",
      commentary:
        "Na spoľahlivý online rozsah nemáme dostatok verifikovaných dát pre túto lokalitu; maklér pripraví osobný odhad.",
      disclaimer: DISCLAIMER,
    };
  }

  const data = loadRegionalPrices();
  const base = lookup.pricePerSqm * sqm;
  const roundTo = data.band_rules.round_to_eur ?? 1000;
  const low = roundBand(base * (1 - lookup.bandLowerPct / 100), roundTo);
  const high = roundBand(base * (1 + lookup.bandUpperPct / 100), roundTo);

  return {
    noEstimate: false,
    low,
    high,
    currency: "EUR",
    pricePerSqm: lookup.pricePerSqm,
    regionCode,
    regionLabel: lookup.regionLabel,
    sourceQuarter: lookup.sourceQuarter,
    sourceNote: lookup.sourceNote,
    commentary: buildFallbackCommentary(input, low, high, lookup.regionLabel, lookup.usedFallback),
    disclaimer: DISCLAIMER,
  };
}

function buildFallbackCommentary(
  input: ValuationPropertyInput,
  low: number,
  high: number,
  regionLabel: string,
  usedFallback: boolean,
): string {
  const typeLabel = input.propertyType === "byt" ? "byt" : "rodinný dom";
  const fallbackNote = usedFallback
    ? " Odhad vychádza z krajského priemeru — v konkrétnej lokalite môže byť rozdiel."
    : "";
  const conditionNote =
    input.condition === "kompletna" || input.condition === "novostavba"
      ? " Po rekonštrukcii sa reálna cena typicky posúva bližšie k hornej hranici pásma."
      : "";
  return `Pre ${typeLabel} (${input.sqm} m²) v regióne ${regionLabel} odhadujeme orientačné pásmo €${low.toLocaleString("sk-SK")} – €${high.toLocaleString("sk-SK")}.${fallbackNote}${conditionNote}`;
}
