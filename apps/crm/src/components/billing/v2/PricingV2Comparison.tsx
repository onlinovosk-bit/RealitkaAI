"use client";

import Link from "next/link";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";
import type { PricingV2ConfigPayload } from "@/lib/pricing-v2-contract";
import { ANNUAL_PROMO_HEADLINE, GUARANTEE_TEXT } from "@/components/marketing/guarantee-copy";
import { isAnnualPromoActive } from "@/lib/pricing-v2";
import { annualDiscountPercent, formatEurCents, formatUserRange } from "./format";

/**
 * Porovnanie pásiem cenníka v3 (len z katalógu, len pri PRICING_V2_ENABLED); nákup je na stránke upgrade.
 *
 * Jedna dominantná cena na kartu (mesačný ekvivalent pri ročnej platbe, bez DPH), pod ňou jednotné riadky
 * (ročne / mesačná platba / kredity) v rovnakom poradí na každej karte, aby sa pásma dali porovnať pohľadom.
 */
export default function PricingV2Comparison({ config }: { config: PricingV2ConfigPayload }) {
  const catalog = config.catalog;
  if (!catalog) return null;
  return (
    <div data-testid="pricing-v2-comparison" className="mx-auto max-w-5xl py-8 px-6" style={{ background: SLATE_HORIZON.bg }}>
      <header className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: SLATE_HORIZON.ink }}>
          Porovnanie programov
        </h1>
        <p className="mt-1" style={{ color: SLATE_HORIZON.muted }}>
          Platíte podľa počtu maklérov – pásmo sa nastaví samo.
        </p>
      </header>

      <div
        className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border px-4 py-3 text-sm"
        style={{ background: WORKDESK_CARD.background, borderColor: WORKDESK_CARD.borderColor }}
      >
        {isAnnualPromoActive() && (
          <span data-testid="compare-promo" className="font-semibold" style={{ color: SLATE_HORIZON.brandDeep }}>
            {ANNUAL_PROMO_HEADLINE}
          </span>
        )}
        <p data-testid="compare-guarantee" className="font-medium" style={{ color: SLATE_HORIZON.greenDark }}>
          {GUARANTEE_TEXT}
        </p>
        <span className="sm:ml-auto text-xs" style={{ color: SLATE_HORIZON.muted }}>
          Hlavná cena je bez DPH; pri každej sume je aj cena s {catalog.vatPercent} % DPH.
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {catalog.bands.map((band) => {
          const from = band.isFromPrice ? "od " : "";
          return (
            <div
              key={band.id}
              data-testid={`compare-${band.id}`}
              className="flex flex-col rounded-xl border p-5"
              style={{ background: WORKDESK_CARD.background, borderColor: WORKDESK_CARD.borderColor, boxShadow: WORKDESK_CARD.boxShadow }}
            >
              <div className="text-lg font-semibold" style={{ color: SLATE_HORIZON.ink }}>{band.label}</div>
              <div className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
                {formatUserRange(band.minUsers, band.maxUsers)}
              </div>

              <div className="mt-4">
                <div className="text-3xl font-bold leading-tight whitespace-nowrap" style={{ color: SLATE_HORIZON.brandDeep }}>
                  {from}
                  {formatEurCents(band.netCents)}
                </div>
                <div className="text-sm" style={{ color: SLATE_HORIZON.ink }}>
                  mesačne bez DPH
                </div>
                <div className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
                  {from}
                  {formatEurCents(band.grossCents)} s DPH · pri ročnej platbe
                </div>
              </div>

              <dl className="mt-4 border-t pt-3 space-y-3 text-sm" style={{ borderColor: WORKDESK_CARD.borderColor }}>
                <div data-testid={`compare-${band.id}-annual`}>
                  <dt className="text-xs uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Ročná platba (12 × cena) · zľava {annualDiscountPercent(band)} %</dt>
                  <dd style={{ color: SLATE_HORIZON.ink }}>
                    <span className="font-semibold">{from}{formatEurCents(band.annual.netCents)}</span> bez DPH
                    <span className="block text-xs" style={{ color: SLATE_HORIZON.muted }}>
                      {formatEurCents(band.annual.grossCents)} s DPH
                    </span>
                  </dd>
                </div>
                <div data-testid={`compare-${band.id}-monthly`}>
                  <dt className="text-xs uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>Mesačná platba</dt>
                  <dd style={{ color: SLATE_HORIZON.ink }}>
                    <span className="font-semibold">{from}{formatEurCents(band.monthly.netCents)}</span> bez DPH / mes.
                    <span className="block text-xs" style={{ color: SLATE_HORIZON.muted }}>
                      {formatEurCents(band.monthly.grossCents)} s DPH
                    </span>
                  </dd>
                </div>
              </dl>

              <p className="mt-auto pt-4 text-sm font-medium" style={{ color: SLATE_HORIZON.ink }}>
                {band.monthlyCredits} kreditov mesačne pre celú kanceláriu
              </p>
            </div>
          );
        })}
      </div>

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
