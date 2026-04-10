'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';

function Orb({ className }: { className: string }) {
  return (
    <div
      className={`pointer-events-none absolute rounded-full blur-[120px] opacity-30 ${className}`}
      style={{ animation: 'floatOrb 8s ease-in-out infinite' }}
    />
  );
}

function LiveLeadCounter() {
  const [count, setCount] = useState(1247);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setCount((p) => p + Math.floor(Math.random() * 5) + 2);
      setFlash(true);
      setTimeout(() => setFlash(false), 300);
    }, 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
      className="inline-flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-3 mt-6"
    >
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-xs text-slate-400">Leady stratené BEZ AI dnes:</span>
      <motion.span
        key={count}
        initial={{ opacity: 0.5, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-xl font-bold font-mono tabular-nums transition-colors ${
          flash ? 'text-red-300' : 'text-red-400'
        }`}
      >
        {count.toLocaleString('sk-SK')}
      </motion.span>
    </motion.div>
  );
}

function DashboardMock() {
  const leads = [
    { name: 'Martin Kováč', status: 'Horúci', score: 94, color: 'text-red-400' },
    { name: 'Jana Horáková', status: 'Obhliadka', score: 81, color: 'text-amber-400' },
    { name: 'Peter Sloboda', status: 'Kontaktovaný', score: 67, color: 'text-cyan-400' },
    { name: 'Eva Machová', status: 'Nový', score: 52, color: 'text-green-400' },
  ];
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/80 p-4 backdrop-blur-2xl">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
        <div className="w-3 h-3 rounded-full bg-red-500/60" />
        <div className="w-3 h-3 rounded-full bg-amber-500/60" />
        <div className="w-3 h-3 rounded-full bg-green-500/60" />
        <span className="ml-2 text-[11px] text-slate-500">Revolis.AI Dashboard</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px] text-green-400">Sofia aktívna</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { label: 'Leady dnes', value: '12', delta: '+3' },
          { label: 'AI odpovede', value: '9', delta: '2min' },
          { label: 'Obhliadky', value: '4', delta: 'zajtra' },
          { label: 'AI skóre', value: '78', delta: '▲' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl bg-slate-800/60 p-2">
            <p className="text-[10px] text-slate-500 mb-0.5">{kpi.label}</p>
            <p className="text-base font-bold text-white">{kpi.value}</p>
            <p className="text-[10px] text-cyan-400">{kpi.delta}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {leads.map((lead, i) => (
          <motion.div
            key={lead.name}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0 + i * 0.12 }}
            className="flex items-center gap-2.5 rounded-xl bg-slate-800/40 border border-slate-700/30 px-3 py-2"
          >
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-[11px] text-cyan-300 font-bold flex-shrink-0">
              {lead.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/80 font-medium truncate">{lead.name}</p>
              <p className="text-[10px] text-slate-500">{lead.status}</p>
            </div>
            <span className={`text-xs font-bold ${lead.color}`}>{lead.score}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(34,211,238,0.12),transparent_60%),radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(99,102,241,0.10),transparent_50%)]" />
      <Orb className="w-96 h-96 bg-cyan-500 top-1/4 left-1/4" />
      <Orb className="w-72 h-72 bg-indigo-500 bottom-1/4 right-1/4" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-24 pb-16"
      >
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* LEFT */}
          <div className="flex-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-sm text-cyan-300"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              AI Chief of Sales pre realitku
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Získaj viac klientov.
              <br />
              Uzatváraj viac obchodov.
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
                Bez chaosu.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg text-slate-300 max-w-lg"
            >
              Revolis.AI ti každý deň vyberie najdôležitejších klientov, nájde im ideálne
              nehnuteľnosti a navrhne ďalší krok. Skôr, než otvoríš CRM.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap gap-4"
            >
              <Link
                href="/register"
                className="relative rounded-full bg-cyan-400 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-[0_0_40px_rgba(34,211,238,0.6)] transition-all duration-200 hover:scale-105 hover:bg-cyan-300 hover:shadow-[0_0_60px_rgba(34,211,238,0.8)] active:scale-95"
              >
                ✦ Začať za 30 sekúnd
              </Link>
              <Link
                href="#pipeline"
                className="rounded-full border border-slate-600/80 bg-slate-900/50 px-7 py-3.5 text-sm font-medium text-slate-100 backdrop-blur-lg transition-all duration-200 hover:border-cyan-300/70 hover:bg-slate-900/80 hover:text-cyan-100"
              >
                ▶ Pozrieť živé demo
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex flex-wrap gap-5 text-xs text-slate-500 pt-2"
            >
              <span>🟢 847 aktívnych maklérov</span>
              <span>⭐ 4.9/5 hodnotenie</span>
              <span>📈 +34% konverzia</span>
              <span>🇸🇰 Made in Slovakia</span>
            </motion.div>

            <LiveLeadCounter />
          </div>

          {/* RIGHT */}
          <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 w-full max-w-xl"
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-cyan-500/10 blur-2xl rounded-3xl" />
              <div className="relative rounded-3xl border border-slate-700/50 bg-slate-900/60 p-2 shadow-[0_0_60px_rgba(15,23,42,0.9)] backdrop-blur-2xl">
                <div className="pointer-events-none absolute -inset-px rounded-3xl border border-cyan-300/20 opacity-60 blur-[1px]" />
                <div className="relative overflow-hidden rounded-2xl bg-slate-900/80">
                  <div className="p-3">
                    <DashboardMock />
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-cyan-400/10 via-transparent to-indigo-400/10 mix-blend-screen" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-slate-600 flex items-start justify-center pt-2">
          <div className="w-1 h-2 rounded-full bg-slate-400" />
        </div>
      </motion.div>
    </section>
  );
}
