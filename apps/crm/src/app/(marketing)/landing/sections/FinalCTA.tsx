'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import CountdownTimer from './CountdownTimer';
import SpotsCounter from './SpotsCounter';
import { LANDING_AI_ASSISTANT_NAME } from '@/app/(marketing)/landing/landing-ai-label';
import { RadiantSpriteIcon } from '@/components/shared/radiant-sprite-icon';
import { SLATE_HORIZON, WORKDESK_CARD } from '@/lib/slate-horizon-theme';

const cardStyle = {
  background: WORKDESK_CARD.background,
  borderColor: WORKDESK_CARD.borderColor,
  boxShadow: WORKDESK_CARD.boxShadow,
};

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32" style={{ background: SLATE_HORIZON.bg }}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: SLATE_HORIZON.heroAmbient }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="flex flex-col items-center gap-8 text-center"
        >
          <p
            className="text-sm uppercase tracking-[0.3em]"
            style={{ color: SLATE_HORIZON.muted }}
          >
            Limitovaná ponuka
          </p>

          <h2
            className="text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl"
            style={{ color: SLATE_HORIZON.ink }}
          >
            Váš AI obchodný pomocník.
            <br />
            <span style={{ color: SLATE_HORIZON.brandDeep }}>Za cenu obeda.</span>
          </h2>

          <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
            <div className="flex h-full flex-col rounded-2xl border p-6 text-left lg:order-1" style={cardStyle}>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: SLATE_HORIZON.muted }}>
                Solo Seat
              </p>
              <div className="mb-2 flex flex-wrap items-end gap-x-2 gap-y-1">
                <span className="text-3xl font-extrabold" style={{ color: SLATE_HORIZON.ink }}>
                  €79
                </span>
                <span className="mb-0.5 text-sm" style={{ color: SLATE_HORIZON.muted }}>
                  /mesiac za jedného makléra
                </span>
              </div>
              <p className="mb-5 text-xs" style={{ color: SLATE_HORIZON.muted }}>
                Základný seat pre samostatného makléra.
              </p>
              <ul className="mb-6 flex-1 space-y-2.5">
                {[
                  'Prehľad dopytov a klientov na jednom mieste',
                  'Základné AI návrhy ďalších krokov',
                  'Jedna licencia · email podpora',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: SLATE_HORIZON.deep }}>
                    <span className="mt-0.5 flex-shrink-0" style={{ color: SLATE_HORIZON.brand }}>
                      •
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`mt-auto block w-full cursor-pointer rounded-full border py-3.5 text-center text-sm font-bold transition-all duration-200 hover:opacity-90 ${SLATE_HORIZON.focusRing}`}
                style={{
                  borderColor: SLATE_HORIZON.softBorder,
                  color: SLATE_HORIZON.brandDeep,
                  background: SLATE_HORIZON.soft,
                }}
              >
                Začať so Solo Seat
              </Link>
            </div>

            <div
              className="relative flex h-full flex-col rounded-2xl border p-6 pt-7 text-left lg:z-10 lg:order-2 lg:scale-[1.02]"
              style={{
                ...cardStyle,
                borderColor: SLATE_HORIZON.brand,
                boxShadow: '0 12px 48px rgba(37,99,235,0.14)',
              }}
            >
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white"
                style={{ background: SLATE_HORIZON.ctaGradient }}
              >
                Odporúčané
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: SLATE_HORIZON.brandDeep }}>
                Team Seat
              </p>
              <div className="mb-1 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-4xl font-extrabold" style={{ color: SLATE_HORIZON.ink }}>
                  €71
                </span>
                <span className="mb-1 text-base" style={{ color: SLATE_HORIZON.muted }}>
                  /mesiac <span style={{ color: SLATE_HORIZON.deep }}>za jedného makléra</span>
                </span>
                <span className="mb-1 ml-auto text-lg line-through" style={{ color: SLATE_HORIZON.muted }}>€79</span>
              </div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: SLATE_HORIZON.brandDeep }}>
                Tímová cena · 3–9 seatov · 10% zľava na seat
              </p>

              <div
                className="mb-5 flex items-center gap-3 rounded-xl border px-4 py-3"
                style={{ background: SLATE_HORIZON.soft, borderColor: SLATE_HORIZON.softBorder }}
              >
                <RadiantSpriteIcon icon="tasks" sizeClassName="h-5 w-5" className="rounded-md shadow-none" />
                <CountdownTimer />
              </div>

              <div className="mb-6">
                <SpotsCounter />
              </div>

              <ul className="mb-6 flex-1 space-y-2.5">
                {[
                  'AI prioritizácia príležitostí každý deň',
                  `${LANDING_AI_ASSISTANT_NAME} — váš AI obchodný pomocník 24/7`,
                  'Stav klientov a pracovná plocha predikcie',
                  'Import príležitostí z portálov (Nehnuteľnosti.sk, Bazos.sk, Topreality.sk, Reality.sk)',
                  'Team Seat: každý maklér má vlastnú licenciu — 71 €/seat/mes',
                  '30-dňová záruka vrátenia peňazí',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: SLATE_HORIZON.deep }}>
                    <span className="mt-0.5 flex-shrink-0" style={{ color: SLATE_HORIZON.brand }}>
                      •
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`mt-auto block w-full cursor-pointer rounded-full py-4 text-center text-base font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] ${SLATE_HORIZON.focusRing}`}
                style={{ background: SLATE_HORIZON.ctaGradient }}
              >
                Aktivovať Team Seat za 71 €/seat
              </Link>
              <p className="mt-3 text-center text-xs" style={{ color: SLATE_HORIZON.muted }}>
                Bez kreditnej karty · Zrušenie kedykoľvek · GDPR · vyrobené na Slovensku
              </p>
            </div>

            <div
              className="flex h-full flex-col rounded-2xl border p-6 text-left lg:order-3"
              style={{ ...cardStyle, borderColor: SLATE_HORIZON.softBorder }}
            >
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: SLATE_HORIZON.brandNavy }}>
                Office Seat — pre kancelárie 10+
              </p>
              <div className="mb-2 flex flex-wrap items-end gap-x-2 gap-y-1">
                <span className="text-3xl font-extrabold" style={{ color: SLATE_HORIZON.ink }}>
                  63 €
                </span>
                <span className="mb-0.5 text-sm" style={{ color: SLATE_HORIZON.muted }}>
                  /seat/mes
                </span>
              </div>
              <p
                className="mb-5 border-l-2 pl-3 text-sm"
                style={{ borderColor: SLATE_HORIZON.amber, color: SLATE_HORIZON.deep }}
              >
                <span className="font-semibold" style={{ color: SLATE_HORIZON.amber }}>
                  10+ seatov v kancelárskom režime
                </span>{' '}
                + owner dashboard, priority support a modular add-ons.
              </p>
              <ul className="mb-6 flex-1 space-y-2.5">
                {[
                  'Office Seat od 10 maklérov, 63 €/seat/mes',
                  'Prehľad celej kancelárie v reálnom čase',
                  'Zdieľaná AI pamäť tímu naprieč maklérmni',
                  'Upozornenie keď konkurencia kontaktuje tvojho klienta',
                  'Roadmap moduly (Protocol AI, Leads Engine) — čoskoro',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: SLATE_HORIZON.deep }}>
                    <span className="mt-0.5 flex-shrink-0" style={{ color: SLATE_HORIZON.brandNavy }}>
                      •
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/support"
                className={`mt-auto block w-full cursor-pointer rounded-full border py-3.5 text-center text-sm font-bold transition-all duration-200 hover:opacity-90 ${SLATE_HORIZON.focusRing}`}
                style={{
                  borderColor: SLATE_HORIZON.softBorder,
                  color: SLATE_HORIZON.brandDeep,
                  background: SLATE_HORIZON.soft,
                }}
              >
                Enterprise — kontaktovať predaj
              </Link>
              <a
                href="tel:+421948444014"
                className="mt-2 block cursor-pointer text-center text-xs transition-colors duration-200 hover:opacity-80"
                style={{ color: SLATE_HORIZON.muted }}
              >
                +421 948 444 014
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-2xl font-extrabold tracking-tight" style={{ color: SLATE_HORIZON.ink }}>
              Predaj viac · Pracuj menej
            </p>
            <p className="text-base font-semibold" style={{ color: SLATE_HORIZON.brandDeep }}>
              Realitky ktoré víťazia, používajú Revolis.AI
            </p>
            <p className="mt-1 text-sm font-bold italic" style={{ color: SLATE_HORIZON.muted }}>
              Revolis.AI nestojí ani zlomok jedného strateného obchodu.
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex w-full max-w-md items-center gap-3 rounded-2xl border px-6 py-4"
            style={{
              background: '#ECFDF5',
              borderColor: '#A7F3D0',
            }}
          >
            <RadiantSpriteIcon icon="billing" sizeClassName="h-8 w-8" className="rounded-lg shadow-none" />
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: SLATE_HORIZON.greenDark }}>
                30-dňová záruka vrátenia peňazí
              </p>
              <p className="mt-0.5 text-xs" style={{ color: SLATE_HORIZON.muted }}>
                Nie ste spokojní? Vrátime každý cent. Bez otázok.
              </p>
            </div>
          </motion.div>

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
