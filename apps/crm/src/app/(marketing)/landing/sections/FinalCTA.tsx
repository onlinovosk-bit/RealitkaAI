'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import CountdownTimer from './CountdownTimer';
import SpotsCounter from './SpotsCounter';
import { AI_ASSISTANT_NAME } from '@/lib/ai-brand';
import { RadiantSpriteIcon } from '@/components/shared/radiant-sprite-icon';

export default function FinalCTA() {
  return (
    <section className="relative py-32 overflow-hidden bg-slate-950">
      {/* Background glows */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[800px] h-[800px] rounded-full bg-cyan-500/[0.07] blur-[160px]" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-indigo-500/[0.07] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="flex flex-col items-center gap-8"
        >
          {/* Label */}
          <p className="text-sm text-slate-500 uppercase tracking-[0.3em]">Limitovaná ponuka</p>

          {/* Headline */}
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

          {/* Pricing card */}
          <div
            className="w-full max-w-md rounded-2xl border p-7 text-left"
            style={{
              background: 'linear-gradient(135deg, #0A1628 0%, #0D1F3D 100%)',
              borderColor: 'rgba(34,211,238,0.25)',
              boxShadow: '0 0 60px rgba(34,211,238,0.08)',
            }}
          >
            {/* Price */}
            <div className="flex items-end gap-3 mb-1">
              <span className="text-4xl font-extrabold text-white" style={{ fontFamily: 'var(--font-syne)' }}>
                €99
              </span>
              <span className="text-slate-400 text-base mb-1">/mesiac</span>
              <span className="ml-auto text-slate-500 line-through text-lg mb-1">€198</span>
            </div>
            <p className="text-xs text-cyan-400 font-semibold mb-5 uppercase tracking-wider">
              Zakladateľská cena · Prvých 20 kancelárií · Potom €198/mes
            </p>

            {/* Countdown */}
            <div
              className="rounded-xl px-4 py-3 mb-5 flex items-center gap-3"
              style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.12)' }}
            >
              <RadiantSpriteIcon icon="tasks" sizeClassName="h-5 w-5" className="rounded-md border-cyan-400/20 shadow-none" />
              <CountdownTimer />
            </div>

            {/* Spots */}
            <div className="mb-6">
              <SpotsCounter />
            </div>

            {/* What's included */}
            <ul className="space-y-2.5 mb-6">
              {[
                'AI prioritizácia príležitostí každý deň',
                `${AI_ASSISTANT_NAME} — váš AI obchodný pomocník 24/7`,
                'Stav klientov a pracovná plocha predikcie',
                'Import príležitostí z portálov (Nehnuteľnosti.sk, BKIS)',
                'Tímový CRM pre až 5 agentov',
                '30-dňová záruka vrátenia peňazí',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <span className="mt-0.5 text-cyan-400 flex-shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>

            {/* CTA button */}
            <Link
              href="/register"
              className="block w-full rounded-full py-4 text-center text-base font-bold text-slate-950 transition-all hover:scale-105 hover:brightness-110 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #22D3EE 0%, #818CF8 100%)',
                boxShadow: '0 0 40px rgba(34,211,238,0.4)',
              }}
            >
              Zabezpečiť miesto za €99/mes
            </Link>

            {/* Trust line */}
            <p className="mt-4 text-center text-xs text-slate-600">
              Bez kreditnej karty · Zrušenie kedykoľvek · GDPR · Made in Slovakia
            </p>
          </div>

          {/* Money-back guarantee */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
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
              <p className="text-xs text-slate-500 mt-0.5">
                Nie ste spokojní? Vrátime každý cent. Bez otázok.
              </p>
            </div>
          </motion.div>

          {/* Secondary link */}
          <Link
            href="/login"
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Už máte účet | Prihlásiť sa
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
