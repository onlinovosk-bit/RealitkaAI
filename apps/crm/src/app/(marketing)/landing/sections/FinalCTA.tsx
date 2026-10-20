'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import FinalCTAV2 from './FinalCTAV2';
import type { PricingV2Catalog } from '@/lib/pricing-v2';
import { RadiantSpriteIcon } from '@/components/shared/radiant-sprite-icon';
import {
  DEMO_CTA,
  DEMO_HREF,
  GUARANTEE_TEXT,
  PRICE_ON_REQUEST_CTA,
  PRICE_ON_REQUEST_HREF,
  PRICE_ON_REQUEST_TEXT,
} from '@/components/marketing/guarantee-copy';
import { SLATE_HORIZON } from '@/lib/slate-horizon-theme';

/**
 * `pricingV2` posiela server len pri zapnutom PRICING_PUBLIC_ENABLED (a PRICING_V2_ENABLED).
 * Bez neho (predvolené) komponent NEOBSAHUJE žiadnu sumu: len „Cenu vám pošleme na vyžiadanie“ a CTA na kontakt / ukážku.
 */
export default function FinalCTA({ pricingV2 = null }: { pricingV2?: PricingV2Catalog | null } = {}) {
  if (pricingV2) return <FinalCTAV2 catalog={pricingV2} />;
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
            Ráno otvoríte Revolis.AI a viete, komu volať a prečo. Cena vychádza z počtu maklérov vo vašej kancelárii.
          </p>

          <div
            data-testid="price-on-request"
            className="flex w-full max-w-xl flex-col items-center gap-5 rounded-2xl border p-8"
            style={{ background: SLATE_HORIZON.soft, borderColor: SLATE_HORIZON.softBorder }}
          >
            <p className="text-2xl font-extrabold" style={{ color: SLATE_HORIZON.ink }}>
              {PRICE_ON_REQUEST_TEXT}
            </p>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={PRICE_ON_REQUEST_HREF}
                className={`cursor-pointer rounded-full px-8 py-3.5 text-center text-base font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] ${SLATE_HORIZON.focusRing}`}
                style={{ background: SLATE_HORIZON.ctaGradient }}
              >
                {PRICE_ON_REQUEST_CTA}
              </Link>
              <Link
                href={DEMO_HREF}
                className={`cursor-pointer rounded-full border px-8 py-3.5 text-center text-base font-bold transition-all duration-200 hover:opacity-90 ${SLATE_HORIZON.focusRing}`}
                style={{ borderColor: SLATE_HORIZON.softBorder, color: SLATE_HORIZON.brandDeep, background: '#fff' }}
              >
                {DEMO_CTA}
              </Link>
            </div>
          </div>

          <div
            className="flex w-full max-w-md items-center gap-3 rounded-2xl border px-6 py-4"
            style={{ background: '#ECFDF5', borderColor: '#A7F3D0' }}
          >
            <RadiantSpriteIcon icon="billing" sizeClassName="h-8 w-8" className="rounded-lg shadow-none" />
            <p data-testid="guarantee" className="text-left text-sm font-semibold" style={{ color: SLATE_HORIZON.greenDark }}>
              {GUARANTEE_TEXT}
            </p>
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
