'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import CountdownTimer from './CountdownTimer';
import SpotsCounter from './SpotsCounter';
import { LANDING_AI_ASSISTANT_NAME } from '@/app/(marketing)/landing/landing-ai-label';
import { RadiantSpriteIcon } from '@/components/shared/radiant-sprite-icon';

const cardShell =
  'flex flex-col rounded-2xl border p-6 text-left h-full ' +
  'bg-gradient-to-br from-[#0A1628] to-[#0D1F3D] border-slate-700/60';

export default function FinalCTA() {
  return (
    <section className="relative py-32 overflow-hidden bg-slate-950">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[800px] h-[800px] rounded-full bg-cyan-500/[0.07] blur-[160px]" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-indigo-500/[0.07] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="flex flex-col items-center gap-8 text-center"
        >
          <p className="text-sm text-slate-500 uppercase tracking-[0.3em]">Limitovaná ponuka</p>

          <h2
            className="text-5xl md:text-6xl font-extrabold text-white leading-tight"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Váš AI obchodný pomocník.
            <br />
            <span className="bg-gradient-to-r from-cyan-300 to-indigo-400 bg-clip-text text-transparent">
              Za cenu obeda.
            </span>
          </h2>

          <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
            {/* Starter */}
            <div className={`${cardShell} lg:order-1`}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Starter</p>
              <div className="flex flex-wrap items-end gap-x-2 gap-y-1 mb-2">
                <span className="text-3xl font-extrabold text-white" style={{ fontFamily: 'var(--font-syne)' }}>
                  €29
                </span>
                <span className="text-slate-400 text-sm mb-0.5">/mesiac za jedného makléra</span>
              </div>
              <p className="text-xs text-slate-500 mb-5">Vstup do Revolis — vhodné na začiatok a menšie objemy.</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  'Prehľad dopytov a klientov na jednom mieste',
                  'Základné AI návrhy ďalších krokov',
                  'Jedna licencia · email podpora',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="mt-0.5 text-cyan-400/80 flex-shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-auto block w-full rounded-full border border-cyan-500/40 bg-slate-900/80 py-3.5 text-center text-sm font-bold text-cyan-200 transition-all hover:border-cyan-400/60 hover:bg-slate-800/90"
              >
                Začať so Starter
              </Link>
            </div>

            {/* Pro — highlighted */}
            <div
              className={
                'relative flex flex-col rounded-2xl border p-6 pt-7 text-left h-full lg:order-2 ' +
                'border-cyan-400/50 bg-gradient-to-br from-[#0A1628] to-[#0D1F3D] ' +
                'shadow-[0_0_60px_rgba(34,211,238,0.12)] ring-2 ring-cyan-400/30 lg:scale-[1.02] lg:z-10'
              }
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-400 px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-950">
                Odporúčané
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400/90 mb-2">Pro</p>
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1 mb-1">
                <span className="text-4xl font-extrabold text-white" style={{ fontFamily: 'var(--font-syne)' }}>
                  €99
                </span>
                <span className="text-slate-400 text-base mb-1">
                  /mesiac <span className="text-slate-300">za jedného makléra</span>
                </span>
                <span className="ml-auto text-slate-500 line-through text-lg mb-1">€198</span>
              </div>
              <p className="text-xs text-cyan-400 font-semibold mb-4 uppercase tracking-wider">
                Zakladateľská cena za makléra · Prvých 20 kancelárií · Potom €198/mes za makléra
              </p>

              <div
                className="rounded-xl px-4 py-3 mb-5 flex items-center gap-3"
                style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.12)' }}
              >
                <RadiantSpriteIcon icon="tasks" sizeClassName="h-5 w-5" className="rounded-md border-cyan-400/20 shadow-none" />
                <CountdownTimer />
              </div>

              <div className="mb-6">
                <SpotsCounter />
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  'AI prioritizácia príležitostí každý deň',
                  `${LANDING_AI_ASSISTANT_NAME} — váš AI obchodný pomocník 24/7`,
                  'Stav klientov a pracovná plocha predikcie',
                  'Import príležitostí z portálov (Nehnuteľnosti.sk, Bazos.sk, Topreality.sk, Reality.sk)',
                  'Pro: každý maklér má vlastnú licenciu — 99 €/mes (nie zdieľaný účet pre celý tím)',
                  '30-dňová záruka vrátenia peňazí',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="mt-0.5 text-cyan-400 flex-shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className="mt-auto block w-full rounded-full py-4 text-center text-base font-bold text-slate-950 transition-all hover:scale-[1.02] hover:brightness-110 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #22D3EE 0%, #818CF8 100%)',
                  boxShadow: '0 0 40px rgba(34,211,238,0.4)',
                }}
              >
                Zabezpečiť Pro za 99 €/mes za makléra
              </Link>
              <p className="mt-3 text-center text-xs text-slate-600">
                Bez kreditnej karty · Zrušenie kedykoľvek · GDPR · vyrobené na Slovensku
              </p>
            </div>

            {/* Enterprise */}
            <div className={`${cardShell} lg:order-3 border-indigo-500/30`}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400/90 mb-2">Enterprise</p>
              <div className="flex flex-wrap items-end gap-x-2 gap-y-1 mb-2">
                <span className="text-3xl font-extrabold text-white" style={{ fontFamily: 'var(--font-syne)' }}>
                  299 €
                </span>
                <span className="text-slate-400 text-sm mb-0.5">/mes za balík</span>
              </div>
              <p className="text-sm text-slate-300 mb-5 border-l-2 border-amber-400/40 pl-3">
                <span className="font-semibold text-amber-200/90">Až 4 licencie</span> — štyria makléri v jednom balíku.
                Vhodné pre kancelárie a tímy.
              </p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  'Jedna faktúra za celý tím (až 4 makléri)',
                  'Rovnaké funkcie ako Pro na každej licencii',
                  'Prioritná podpora a onboarding',
                  'SLA a súlad podľa dohody',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="mt-0.5 text-indigo-400/90 flex-shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/support"
                className="mt-auto block w-full rounded-full border border-indigo-500/50 bg-indigo-950/40 py-3.5 text-center text-sm font-bold text-indigo-100 transition-all hover:border-indigo-400/70 hover:bg-indigo-950/70"
              >
                Enterprise — kontaktovať predaj
              </Link>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <p
              className="text-2xl font-extrabold tracking-tight"
              style={{ fontFamily: 'var(--font-syne)', color: '#F0F9FF' }}
            >
              Predaj viac · Pracuj menej
            </p>
            <p className="text-sm" style={{ color: '#22D3EE' }}>
              Realitky ktoré víťazia, používajú Revolis.AI
            </p>
            <p className="text-xs mt-1" style={{ color: '#334155' }}>
              Revolis.AI nestojí ani zlomok jedného strateného obchodu.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400 max-w-2xl">
            <Link href="/privacy-policy" className="hover:text-cyan-300 transition-colors">
              Zásady ochrany osobných údajov
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-cyan-300 transition-colors">
              VOP / podmienky
            </Link>
            <span>·</span>
            <Link href="/security" className="hover:text-cyan-300 transition-colors">
              Bezpečnosť a súlad
            </Link>
            <span>·</span>
            <Link href="/trust-center" className="hover:text-cyan-300 transition-colors">
              Centrum dôvery
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 rounded-2xl border px-6 py-4 max-w-md w-full"
            style={{
              background: 'rgba(16,185,129,0.05)',
              borderColor: 'rgba(16,185,129,0.2)',
            }}
          >
            <RadiantSpriteIcon icon="billing" sizeClassName="h-8 w-8" className="rounded-lg border-cyan-400/20 shadow-none" />
            <div className="text-left">
              <p className="text-sm font-semibold text-emerald-400">30-dňová záruka vrátenia peňazí</p>
              <p className="text-xs text-slate-500 mt-0.5">Nie ste spokojní? Vrátime každý cent. Bez otázok.</p>
            </div>
          </motion.div>

          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            Už máte účet | Prihlásiť sa
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
