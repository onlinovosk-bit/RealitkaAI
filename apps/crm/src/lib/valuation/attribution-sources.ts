import type { ValuationPriceSource } from "@/lib/valuation/types";

/** Attribution sources derived from which price ladder produced the estimate. */
export function sourcesForPriceSource(
  priceSource: ValuationPriceSource | undefined,
): string[] {
  if (!priceSource || priceSource === "none") return [];
  if (priceSource === "city") {
    return ["NBS (United Classifieds, NARKS)", "Realitný barometer RÚ SR"];
  }
  return ["NBS (United Classifieds, NARKS)"];
}
