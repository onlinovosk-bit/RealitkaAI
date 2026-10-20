"use client";

import Link from "next/link";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";
import type { PricingV2ConfigPayload } from "@/lib/pricing-v2-contract";
import { ANNUAL_PROMO_HEADLINE, GUARANTEE_TEXT } from "@/components/marketing/guarantee-copy";
import { isAnnualPromoActive } from "@/lib/pricing-v2";
import { formatEurCents, formatUserRange } from "./format";

/** Porovnanie pásiem cenníka v3 (len z katalógu, len pri PRICING_V2_ENABLED); nákup je na stránke upgrade. */
export default function PricingV2Comparison({ config }: { config: PricingV2ConfigPayload }) {
  const catalog = config.catalog;
  if (!catalog) return null;
  return (
    <div data-testid="pricing-v2-comparison" className="mx-auto max-w-5xl py-8 px-6" style={{ background: SLATE_HORIZON.bg }}>
      <header className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: SLATE_HORIZON.ink }}>
          Porovnanie programov
        </h1>
        <p style={{ color: SLATE_HORIZON.muted }}>
          Cena podľa počtu maklérov; pásmo sa nastaví samo. Ceny sú bez DPH, konečná suma s {catalog.vatPercent} % DPH je pri každej cene.
        </p>
        {isAnnualPromoActive() && (
          <p data-testid="compare-promo" className="mt-2 text-sm font-semibold" style={{ color: SLATE_HORIZON.brandDeep }}>
            {ANNUAL_PROMO_HEADLINE}
          </p>
        )}
      </header>
      <div className="grid gap-4 md:grid-cols-4">
        {catalog.bands.map((band) => (
          <div
            key={band.id}
            data-testid={`compare-${band.id}`}
            className="rounded-xl border p-5"
            style={{ background: WORKDESK_CARD.background, borderColor: WORKDESK_CARD.borderColor, boxShadow: WORKDESK_CARD.boxShadow }}
          >
            <div className="font-semibold" style={{ color: SLATE_HORIZON.ink }}>{band.label}</div>
            <div className="text-xs mb-2" style={{ color: SLATE_HORIZON.muted }}>
              {formatUserRange(band.minUsers, band.maxUsers)}
            </div>
            <div className="text-2xl font-bold" style={{ color: SLATE_HORIZON.brandDeep }}>
              {band.isFromPrice ? "od " : ""}
              {formatEurCents(band.netCents)}
              <span className="text-sm font-normal" style={{ color: SLATE_HORIZON.muted }}> bez DPH / mes. pri ročnej platbe</span>
            </div>
            <div className="text-sm" style={{ color: SLATE_HORIZON.ink }}>
              {band.isFromPrice ? "od " : ""}
              {formatEurCents(band.grossCents)} s {catalog.vatPercent} % DPH / mes.
            </div>
            <div data-testid={`compare-${band.id}-annual`} className="text-xs mt-1" style={{ color: SLATE_HORIZON.muted }}>
              Ročne {band.isFromPrice ? "od " : ""}
              {formatEurCents(band.annual.netCents)} bez DPH ({formatEurCents(band.annual.grossCents)} s DPH), 12 × mesačná cena pri ročnej platbe
            </div>
            <div data-testid={`compare-${band.id}-monthly`} className="text-xs mt-1" style={{ color: SLATE_HORIZON.muted }}>
              Pri mesačnej platbe (+20 %) {band.isFromPrice ? "od " : ""}
              {formatEurCents(band.monthly.netCents)} bez DPH ({formatEurCents(band.monthly.grossCents)} s DPH) mesačne
            </div>
            <p className="text-sm mt-3" style={{ color: SLATE_HORIZON.ink }}>
              {band.monthlyCredits} kreditov mesačne pre celú kanceláriu
            </p>
          </div>
        ))}
      </div>
      <p data-testid="compare-guarantee" className="mt-6 text-sm font-medium" style={{ color: SLATE_HORIZON.greenDark }}>
        {GUARANTEE_TEXT}
      </p>
      <Link
        href="/upgrade"
        className="mt-8 inline-flex rounded-md px-6 py-2.5 text-sm font-semibold text-white"
        style={{ background: SLATE_HORIZON.topbarGradient }}
      >
        Vybrať počet maklérov a objednať
      </Link>
    </div>
  );
}
