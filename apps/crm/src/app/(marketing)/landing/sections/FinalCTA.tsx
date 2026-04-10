'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function FinalCTA() {
  return (
    <section className="relative py-40 overflow-hidden bg-slate-950">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[700px] h-[700px] rounded-full bg-cyan-500/[0.08] blur-[140px]" />
        <div className="absolute w-[350px] h-[350px] rounded-full bg-indigo-500/[0.08] blur-[80px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
        >
          <p className="text-sm text-slate-500 uppercase tracking-[0.3em] mb-6">Začni dnes</p>
          <h2
            className="text-6xl md:text-7xl font-extrabold text-white leading-tight mb-6"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Začnite získavať
            <br />
            <span className="bg-gradient-to-r from-cyan-300 to-indigo-400 bg-clip-text text-transparent">
              viac leadov
            </span>
            <br />
            už zajtra.
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            Nastavenie trvá 15 minút. Prvých 30 dní úplne zadarmo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              href="/register"
              className="relative rounded-full bg-cyan-400 px-9 py-4 text-base font-bold text-slate-950 shadow-[0_0_60px_rgba(34,211,238,0.6)] transition-all hover:scale-105 hover:bg-cyan-300 active:scale-95"
            >
              ✦ Spustiť Revolis.AI zadarmo
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-slate-700 bg-slate-900/50 px-7 py-4 text-base font-medium text-slate-300 backdrop-blur-sm transition-all hover:border-cyan-500/50 hover:text-cyan-200"
            >
              Prihlásiť sa
            </Link>
          </div>
          <p className="text-sm text-slate-600">
            Bez kreditnej karty · Cancel kedykoľvek · GDPR compliant · 🇸🇰 Made in Slovakia
          </p>
        </motion.div>
      </div>
    </section>
  );
}
