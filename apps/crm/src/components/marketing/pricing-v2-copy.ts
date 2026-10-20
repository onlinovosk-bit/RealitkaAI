/**
 * Cenník v3 (PR1, GO 2026-10-19): spoločné pomocné funkcie pre texty. Všetky sumy idú VÝHRADNE z `buildPricingV2Catalog`
 * (pricing-v2.ts); žiadna cena sa tu nezapisuje ručne. Bez Reactu, bez Stripe, bez DB.
 *
 * Dva samostatné prepínače (server):
 *  - `PRICING_V2_ENABLED` -> `getPricingV2CatalogIfEnabled()`: prihlásená aplikácia (billing pre ownera) smie ukázať ceny.
 *  - `PRICING_PUBLIC_ENABLED` -> `getPublicPricingCatalog()` (public-pricing.ts): verejný web smie ukázať ceny.
 * Klientske komponenty dostanú katalóg ako prop alebo cez `PricingV2Provider`. Katalóg `null` = žiadna suma.
 */
import {
  buildPricingV2Catalog,
  isPricingV2Enabled,
  type PricingV2Catalog,
} from "@/lib/pricing-v2";

export type PricingV2CatalogBand = PricingV2Catalog["bands"][number];
export type PricingV2CatalogPack = PricingV2Catalog["packs"][number];

export {
  ANNUAL_PROMO_HEADLINE,
  DEMO_CTA,
  DEMO_HREF,
  GUARANTEE_TEXT,
  PRICE_ON_REQUEST_CTA,
  PRICE_ON_REQUEST_HREF,
  PRICE_ON_REQUEST_TEXT,
} from "./guarantee-copy";
import { ANNUAL_PROMO_HEADLINE } from "./guarantee-copy";

/** Server: katalóg, ak je v2 zapnuté, inak null. Určené pre prihlásenú aplikáciu, NIE pre verejný web. */
export function getPricingV2CatalogIfEnabled(
  env: Record<string, string | undefined> = process.env,
): PricingV2Catalog | null {
  return isPricingV2Enabled(env) ? buildPricingV2Catalog() : null;
}

const NBSP = "\u00a0";

/** 2500 -> "25 €", 3075 -> "30,75 €" (slovenský zápis, pevná medzera pred €). */
export function formatEurFromCents(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const rest = Math.abs(cents % 100);
  return rest === 0 ? `${whole}${NBSP}€` : `${whole},${String(rest).padStart(2, "0")}${NBSP}€`;
}

function formatPercent(vatPercent: number): string {
  return `${String(vatPercent).replace(".", ",")}${NBSP}%`;
}

export function usersRangeLabel(band: Pick<PricingV2CatalogBand, "minUsers" | "maxUsers">): string {
  if (band.maxUsers === null) return `${band.minUsers} a viac maklérov`;
  if (band.minUsers === band.maxUsers) return band.minUsers === 1 ? "1 maklér" : `${band.minUsers} makléri`;
  return `${band.minUsers}–${band.maxUsers} maklérov`;
}

/** Základ pásma: "25 € mesačne bez DPH pri ročnej platbe" (pásma s rastúcou cenou: "od 74 € ..."). */
export function netPriceLine(band: Pick<PricingV2CatalogBand, "netCents" | "isFromPrice">): string {
  return `${band.isFromPrice ? "od " : ""}${formatEurFromCents(band.netCents)} mesačne bez DPH pri ročnej platbe`;
}

/** "30,75 € s DPH 23 %" (pásma s rastúcou cenou: "od 91,02 € s DPH 23 %"). */
export function grossPriceLine(
  band: Pick<PricingV2CatalogBand, "grossCents" | "isFromPrice">,
  vatPercent: number,
): string {
  return `${band.isFromPrice ? "od " : ""}${formatEurFromCents(band.grossCents)} s DPH ${formatPercent(vatPercent)}`;
}

/** Mesačná platba bez záväzku (+20 %): "30 € mesačne bez DPH pri mesačnej platbe (+20 %)". */
export function monthlyBillingLine(band: Pick<PricingV2CatalogBand, "monthly" | "isFromPrice">): string {
  return `${band.isFromPrice ? "od " : ""}${formatEurFromCents(band.monthly.netCents)} mesačne bez DPH pri mesačnej platbe (+20${NBSP}%)`;
}

/** Počet kreditov mesačne pre celú kanceláriu (grant patrí kancelárii, nie používateľovi). */
export function monthlyCreditsLine(band: Pick<PricingV2CatalogBand, "monthlyCredits">): string {
  return `${band.monthlyCredits} kreditov mesačne pre celú kanceláriu`;
}

/** "kredity navyše: 50 kreditov mesačne za 26 € bez DPH (31,98 € s DPH 23 %)" pre mesačný balík kreditov. */
export function packPriceLine(pack: PricingV2CatalogPack, vatPercent: number): string {
  return `${pack.credits} kreditov mesačne navyše: ${formatEurFromCents(pack.netCents)} mesačne bez DPH (${formatEurFromCents(pack.grossCents)} s DPH ${formatPercent(vatPercent)})`;
}

/** CTA zamknutého obsahu: cena najnižšieho pásma z katalógu (bez DPH, pri ročnej platbe). */
export function unlockCtaLabelV2(catalog: Pick<PricingV2Catalog, "bands">): string {
  const cheapest = [...catalog.bands].sort((a, b) => a.netCents - b.netCents)[0];
  return `Odomknúť ďalšie príležitosti — plány od ${formatEurFromCents(cheapest.netCents)} mesačne bez DPH pri ročnej platbe`;
}

/** Jednorazové dokúpenie: "0,75 € za kredit bez DPH (0,92 € s DPH 23 %)". */
export function creditUnitLine(catalog: Pick<PricingV2Catalog, "creditUnit" | "vatPercent">): string {
  return `${formatEurFromCents(catalog.creditUnit.netCents)} za kredit bez DPH (${formatEurFromCents(catalog.creditUnit.grossCents)} s DPH ${formatPercent(catalog.vatPercent)})`;
}

/** Akcia pri ročnej platbe: nadpis + vysvetlenie (platnosť do 31. 12. 2026), len ak je akcia aktívna. */
export function annualPromoLines(catalog: Pick<PricingV2Catalog, "promo">): string[] {
  if (!catalog.promo.active) return [];
  return [ANNUAL_PROMO_HEADLINE, "Akcia platí pri ročnej platbe do 31. 12. 2026. Od druhého roka platí bežná ročná cena."];
}
