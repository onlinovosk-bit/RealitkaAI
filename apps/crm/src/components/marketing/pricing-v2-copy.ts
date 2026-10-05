/**
 * Cenník v2 (W2-D): spoločné pomocné funkcie pre texty. Všetky sumy idú VÝHRADNE z `buildPricingV2Catalog`
 * (pricing-v2.ts); žiadna cena sa tu nezapisuje ručne. Bez Reactu, bez Stripe, bez DB.
 *
 * Prepínač `PRICING_V2_ENABLED` sa číta na serveri cez `getPricingV2CatalogIfEnabled()`; klientske komponenty
 * dostanú katalóg ako prop alebo cez `PricingV2Provider` (pricing-v2-context.tsx). Katalóg `null` = legacy výstup.
 */
import {
  buildPricingV2Catalog,
  isPricingV2Enabled,
  type PricingV2Catalog,
} from "@/lib/pricing-v2";

export type PricingV2CatalogBand = PricingV2Catalog["bands"][number];
export type PricingV2CatalogPack = PricingV2Catalog["packs"][number];

/** Server: katalóg, ak je v2 zapnuté, inak null (legacy výstup). */
export function getPricingV2CatalogIfEnabled(
  env: Record<string, string | undefined> = process.env,
): PricingV2Catalog | null {
  return isPricingV2Enabled(env) ? buildPricingV2Catalog() : null;
}

const NBSP = " ";

/** 2500 → „25 €“, 3075 → „30,75 €“ (slovenský zápis, pevná medzera pred €). */
export function formatEurFromCents(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const rest = Math.abs(cents % 100);
  return rest === 0 ? `${whole}${NBSP}€` : `${whole},${String(rest).padStart(2, "0")}${NBSP}€`;
}

function formatPercent(vatPercent: number): string {
  return `${String(vatPercent).replace(".", ",")}${NBSP}%`;
}

export function usersRangeLabel(band: Pick<PricingV2CatalogBand, "minUsers" | "maxUsers">): string {
  if (band.maxUsers === null) return `${band.minUsers} a viac používateľov`;
  if (band.minUsers === band.maxUsers) return band.minUsers === 1 ? "1 používateľ" : `${band.minUsers} používatelia`;
  return `${band.minUsers}–${band.maxUsers} používateľov`;
}

/** „25 € mesačne bez DPH“ (Sieť: „od 349 € mesačne bez DPH“). */
export function netPriceLine(band: Pick<PricingV2CatalogBand, "netCents" | "isFromPrice">): string {
  return `${band.isFromPrice ? "od " : ""}${formatEurFromCents(band.netCents)} mesačne bez DPH`;
}

/** „30,75 € s DPH 23 %“ (Sieť: „od 429,27 € s DPH 23 %“). */
export function grossPriceLine(
  band: Pick<PricingV2CatalogBand, "grossCents" | "isFromPrice">,
  vatPercent: number,
): string {
  return `${band.isFromPrice ? "od " : ""}${formatEurFromCents(band.grossCents)} s DPH ${formatPercent(vatPercent)}`;
}

/** Počet kreditov mesačne pre celú kanceláriu (grant patrí kancelárii, nie používateľovi). */
export function monthlyCreditsLine(band: Pick<PricingV2CatalogBand, "monthlyCredits">): string {
  return `${band.monthlyCredits} kreditov mesačne pre celú kanceláriu`;
}

/** „34 € mesačne bez DPH (40,82 € s DPH 23 %)“ pre mesačný balík kreditov. */
export function packPriceLine(pack: PricingV2CatalogPack, vatPercent: number): string {
  return `${pack.credits} kreditov mesačne navyše: ${formatEurFromCents(pack.netCents)} mesačne bez DPH (${formatEurFromCents(pack.grossCents)} s DPH ${formatPercent(vatPercent)})`;
}

/** CTA zamknutého obsahu vo v2: bez názvu legacy programu, cena najnižšieho pásma z katalógu (bez DPH). */
export function unlockCtaLabelV2(catalog: Pick<PricingV2Catalog, "bands">): string {
  const cheapest = [...catalog.bands].sort((a, b) => a.netCents - b.netCents)[0];
  return `Odomknúť ďalšie príležitosti — plány od ${formatEurFromCents(cheapest.netCents)} mesačne bez DPH`;
}

/** Jednorazové dokúpenie: „0,70 € za kredit bez DPH (0,86 € s DPH 23 %)“. */
export function creditUnitLine(catalog: Pick<PricingV2Catalog, "creditUnit" | "vatPercent">): string {
  return `${formatEurFromCents(catalog.creditUnit.netCents)} za kredit bez DPH (${formatEurFromCents(catalog.creditUnit.grossCents)} s DPH ${formatPercent(catalog.vatPercent)})`;
}
