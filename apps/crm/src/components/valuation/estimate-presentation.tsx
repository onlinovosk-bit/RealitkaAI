import type { ValuationEstimateResult } from "@/lib/valuation/types";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";

export const ORIENTATION_COPY =
  "Orientačný odhad z oficiálnych dát. Presnú cenu určí maklér po obhliadke.";

export const NATIONAL_WIDER_COPY =
  "Pre vašu lokalitu zatiaľ nemáme podrobné dáta, preto je rozpätie širšie.";

export const INDIVIDUAL_ESTIMATE_COPY =
  "Pre vašu lokalitu pripravíme odhad individuálne — je presnejší než automatický výpočet. Nechajte nám kontakt a maklér vám ho pripraví.";

/** Slovak locale band: "145 000 – 179 000 €" (no leading €). */
export function formatValuationPriceBand(low: number, high: number): string {
  const fmt = (n: number) =>
    n.toLocaleString("sk-SK").replace(/[\u00a0\u202f]/g, " ");
  return `${fmt(low)} – ${fmt(high)} €`;
}

export function hasNumericValuationBand(estimate: ValuationEstimateResult): boolean {
  if (estimate.noEstimate) return false;
  if (estimate.priceSource === "none") return false;
  return typeof estimate.low === "number" && typeof estimate.high === "number";
}

type Props = {
  estimate: ValuationEstimateResult;
};

/**
 * Dominant band + admitted-range copy for valuation widget result/estimate steps.
 */
export function ValuationEstimatePresentation({ estimate }: Props) {
  const showBand = hasNumericValuationBand(estimate);

  if (!showBand) {
    return (
      <div data-testid="valuation-estimate-presentation">
        <p
          className="mt-3 text-base leading-relaxed"
          style={{ color: SLATE_HORIZON.ink }}
          data-testid="valuation-individual-estimate"
        >
          {INDIVIDUAL_ESTIMATE_COPY}
        </p>
        {estimate.disclaimer ? (
          <p className="mt-4 text-xs leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
            {estimate.disclaimer}
            {estimate.sourceQuarter ? ` · Zdroj: NBS ${estimate.sourceQuarter}.` : ""}
          </p>
        ) : null}
      </div>
    );
  }

  const band = formatValuationPriceBand(estimate.low!, estimate.high!);

  return (
    <div data-testid="valuation-estimate-presentation">
      <p
        className="mt-4 text-3xl font-black"
        style={{ color: SLATE_HORIZON.ink }}
        data-testid="valuation-price-band"
      >
        {band}
      </p>
      <p
        className="mt-3 text-base leading-relaxed"
        style={{ color: SLATE_HORIZON.ink }}
        data-testid="valuation-orientation-copy"
      >
        {ORIENTATION_COPY}
      </p>
      {estimate.priceSource === "national" ? (
        <p
          className="mt-2 text-base leading-relaxed"
          style={{ color: SLATE_HORIZON.ink }}
          data-testid="valuation-national-wider-copy"
        >
          {NATIONAL_WIDER_COPY}
        </p>
      ) : null}
      {estimate.commentary ? (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
          {estimate.commentary}
        </p>
      ) : null}
      <p className="mt-4 text-xs leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
        {estimate.disclaimer}
        {estimate.sourceQuarter ? ` · Zdroj: NBS ${estimate.sourceQuarter}.` : ""}
      </p>
    </div>
  );
}
