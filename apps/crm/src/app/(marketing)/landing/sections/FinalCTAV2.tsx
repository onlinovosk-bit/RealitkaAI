'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { PricingV2Catalog } from '@/lib/pricing-v2';
import {
  creditUnitLine,
  formatEurFromCents,
  grossPriceLine,
  monthlyCreditsLine,
  netPriceLine,
  usersRangeLabel,
} from '@/components/marketing/pricing-v2-copy';
import { SLATE_HORIZON, WORKDESK_CARD } from '@/lib/slate-horizon-theme';

const cardStyle = {
  background: WORKDESK_CARD.background,
  borderColor: WORKDESK_CARD.borderColor,
  boxShadow: WORKDESK_CARD.boxShadow,
};

/**
 * Cenník v2 (W2-D) pre záver landing stránky. Ceny výhradne z katalógu `buildPricingV2Catalog`;
 * komponent sa renderuje len keď server pošle katalóg (prepínač PRICING_V2_ENABLED zapnutý).
 * Text vedie VÝSLEDKOM pre kanceláriu (clay-positioning-reframe), nie zoznamom funkcií.
 * Owner Cockpit sa v v2 ponuke neukazuje. Záruka vrátenia peňazí sa tu neuvádza, kým founder nepotvrdí,
 * že platí aj pre v2 (viď docs/pricing/w2d-copy-and-legal-review.md).
 */
export default function FinalCTAV2({ catalog }: { catalog: PricingV2Catalog }) {
  const cheapestPack = [...catalog.packs].sort((a, b) => a.netCents - b.netCents)[0];

  return (
    <section className="relative overflow-hidden py-24 sm:py-32" style={{ background: SLATE_HORIZON.bg }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: SLATE_HORIZON.heroAmbient }} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="flex flex-col items-center gap-8 text-center"
        >
          <p className="text-sm uppercase tracking-[0.3em]" style={{ color: SLATE_HORIZON.muted }}>
            Cenník pre kancelárie
          </p>

          <h2
            className="text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl"
            style={{ color: SLATE_HORIZON.ink }}
          >
            Neprídete o províziu,
            <br />
            <span style={{ color: SLATE_HORIZON.brandDeep }}>lebo ste zabudli zavolať.</span>
          </h2>

          <p className="max-w-2xl text-base" style={{ color: SLATE_HORIZON.deep }}>
            Ráno otvoríte Revolis.AI a viete, komu volať a prečo. Platíte jeden mesačný paušál za celú kanceláriu podľa
            počtu ľudí v tíme.
          </p>

          <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:items-stretch">
            {catalog.bands.map((band) => (
              <div key={band.id} className="flex h-full flex-col rounded-2xl border p-6 text-left" style={cardStyle}>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: SLATE_HORIZON.brandDeep }}>
                  {band.label}
                </p>
                <p className="mb-4 text-sm" style={{ color: SLATE_HORIZON.muted }}>
                  {usersRangeLabel(band)}
                </p>
                <p className="text-2xl font-extrabold" style={{ color: SLATE_HORIZON.ink }}>
                  {netPriceLine(band)}
                </p>
                <p className="mb-5 mt-1 text-sm" style={{ color: SLATE_HORIZON.muted }}>
                  {grossPriceLine(band, catalog.vatPercent)}
                </p>
                <p className="mb-6 flex-1 text-sm" style={{ color: SLATE_HORIZON.deep }}>
                  {monthlyCreditsLine(band)}
                </p>
                <Link
                  href={band.isFromPrice ? '/support' : '/register'}
                  className={`mt-auto block w-full cursor-pointer rounded-full border py-3.5 text-center text-sm font-bold transition-all duration-200 hover:opacity-90 ${SLATE_HORIZON.focusRing}`}
                  style={{
                    borderColor: SLATE_HORIZON.softBorder,
                    color: SLATE_HORIZON.brandDeep,
                    background: SLATE_HORIZON.soft,
                  }}
                >
                  {band.isFromPrice ? 'Dohodnúť cenu pre sieť' : `Začať s plánom ${band.label}`}
                </Link>
              </div>
            ))}
          </div>

          <div className="max-w-2xl text-sm" style={{ color: SLATE_HORIZON.muted }}>
            <p>
              Kredity navyše: mesačné balíky od {cheapestPack ? formatEurFromCents(cheapestPack.netCents) : ''} mesačne bez DPH,
              alebo jednorazovo {creditUnitLine(catalog)}.
            </p>
            <p className="mt-2">Ceny sú uvedené mesačne bez DPH; konečná cena je vždy uvedená aj s DPH.</p>
          </div>

          <div
            className="flex max-w-2xl flex-wrap items-center justify-center gap-3 text-[11px]"
            style={{ color: SLATE_HORIZON.muted }}
          >
            <Link href="/privacy-policy" className="cursor-pointer transition-colors duration-200 hover:text-blue-700">
              Zásady ochrany osobných údajov
            </Link>
            <span>·</span>
            <Link href="/terms" className="cursor-pointer transition-colors duration-200 hover:text-blue-700">
              VOP / podmienky
            </Link>
            <span>·</span>
            <Link href="/security" className="cursor-pointer transition-colors duration-200 hover:text-blue-700">
              Bezpečnosť a súlad
            </Link>
            <span>·</span>
            <Link href="/trust-center" className="cursor-pointer transition-colors duration-200 hover:text-blue-700">
              Centrum dôvery
            </Link>
          </div>

          <Link
            href="/login"
            className="cursor-pointer text-sm transition-colors duration-200 hover:opacity-80"
            style={{ color: SLATE_HORIZON.muted }}
          >
            Už máte účet | Prihlásiť sa
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
