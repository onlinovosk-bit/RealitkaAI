import { resolveRegionFromLocation } from "@/lib/valuation/resolve-region";
import type { PriceSource } from "@/lib/valuation/resolve-region";
import * as regionalData from "@/lib/valuation/regional-data";
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
  const resolved = resolveRegionFromLocation(input.location);
  const lookup = regionalData.lookupVerifiedPricePerSqm(
    resolved,
    input.propertyType,
  );

  if (!lookup) {
    console.warn(
      `[valuation] priceSource=none location=${JSON.stringify(input.location)}`,
    );
    return {
      noEstimate: true,
      currency: "EUR",
      priceSource: "none" satisfies PriceSource,
      commentary:
        "Na spoľahlivý online rozsah nemáme dostatok verifikovaných dát pre túto lokalitu; maklér pripraví osobný odhad.",
      disclaimer: DISCLAIMER,
    };
  }

  if (lookup.priceSource === "national") {
    console.warn(
      `[valuation] priceSource=national location=${JSON.stringify(input.location)} regionCode=${resolved.regionCode}`,
    );
  }

  const data = regionalData.loadRegionalPrices();
  const base = lookup.pricePerSqm * sqm;
  const roundTo = data.band_rules.round_to_eur ?? 1000;
  const low = regionalData.roundBand(
    base * (1 - lookup.bandLowerPct / 100),
    roundTo,
  );
  const high = regionalData.roundBand(
    base * (1 + lookup.bandUpperPct / 100),
    roundTo,
  );

  return {
    noEstimate: false,
    low,
    high,
    currency: "EUR",
    pricePerSqm: lookup.pricePerSqm,
    regionCode: resolved.regionCode,
    regionLabel: lookup.regionLabel,
    sourceQuarter: lookup.sourceQuarter,
    sourceNote: lookup.sourceNote,
    priceSource: lookup.priceSource,
    commentary: buildFallbackCommentary(
      input,
      low,
      high,
      lookup.regionLabel,
      lookup.usedFallback,
    ),
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
