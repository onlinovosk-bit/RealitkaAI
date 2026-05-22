'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { LANDING_AI_ASSISTANT_NAME } from '@/app/(marketing)/landing/landing-ai-label';
import { RadiantSpriteIcon } from '@/components/shared/radiant-sprite-icon';
import { SLATE_HORIZON, SLATE_HORIZON_BADGES, WORKDESK_CARD } from '@/lib/slate-horizon-theme';
import {
  HeroEmailCapture,
  HeroSocialProof,
  HERO_SUBHEADLINE,
  HeroTrustBar,
} from './HeroEmailCapture';

function LiveLeadCounter() {
  const prefersReducedMotion = useReducedMotion();
  const [count, setCount] = useState(1247);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const t = setInterval(() => {
      setCount((p) => p + Math.floor(Math.random() * 5) + 2);
      setFlash(true);
      setTimeout(() => setFlash(false), 300);
    }, 2800);
    return () => clearInterval(t);
  }, [prefersReducedMotion]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
      className="mt-6 inline-flex max-w-full flex-wrap items-center gap-3 rounded-2xl border px-5 py-3"
      style={{
        background: SLATE_HORIZON_BADGES.hot.bg,
        borderColor: SLATE_HORIZON_BADGES.hot.border,
      }}
    >
      <span
        className={`h-2 w-2 rounded-full ${prefersReducedMotion ? '' : 'animate-pulse'}`}
        style={{ background: SLATE_HORIZON.red }}
      />
      <span className="text-xs" style={{ color: SLATE_HORIZON.deep }}>
        Odhad ušlých príležitostí bez AI dnes:
      </span>
      <motion.span
        key={count}
        initial={prefersReducedMotion ? false : { opacity: 0.5, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-mono text-xl font-bold tabular-nums transition-colors duration-200"
        style={{ color: flash ? SLATE_HORIZON.danger : SLATE_HORIZON.red }}
      >
        {count.toLocaleString('sk-SK')}
      </motion.span>
    </motion.div>
  );
}

function DashboardMock() {
  const leads = [
    { name: 'Martin Kováč', status: 'Horúci', score: 94, color: SLATE_HORIZON.red },
    { name: 'Jana Horáková', status: 'Obhliadka', score: 81, color: SLATE_HORIZON.amber },
    { name: 'Peter Sloboda', status: 'Kontaktovaný', score: 67, color: SLATE_HORIZON.brand },
    { name: 'Eva Machová', status: 'Nový', score: 52, color: SLATE_HORIZON.greenDark },
  ];

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <div className="mb-3 flex items-center gap-2 border-b pb-3" style={{ borderColor: SLATE_HORIZON.line }}>
        <div className="h-3 w-3 rounded-full bg-red-400/80" />
        <div className="h-3 w-3 rounded-full bg-amber-400/80" />
        <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
        <span className="ml-2 text-[11px]" style={{ color: SLATE_HORIZON.muted }}>
          Revolis.AI — prehľad
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[11px] font-semibold" style={{ color: SLATE_HORIZON.greenDark }}>
            {LANDING_AI_ASSISTANT_NAME} aktívny
          </span>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-4 gap-2">
        {[
          { label: 'Záujemcovia dnes', value: '12', delta: '+3' },
          { label: 'AI odpovede', value: '9', delta: '2 min' },
          { label: 'Obhliadky', value: '4', delta: 'zajtra' },
          { label: 'AI skóre', value: '78', delta: '+ trend' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border p-2"
            style={{ background: SLATE_HORIZON.bg, borderColor: SLATE_HORIZON.line }}
          >
            <p className="mb-0.5 text-[10px]" style={{ color: SLATE_HORIZON.muted }}>
              {kpi.label}
            </p>
            <p className="text-base font-bold" style={{ color: SLATE_HORIZON.ink }}>
              {kpi.value}
            </p>
            <p className="text-[10px] font-semibold" style={{ color: SLATE_HORIZON.brandDeep }}>
              {kpi.delta}
            </p>
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
            className="flex items-center gap-2.5 rounded-xl border px-3 py-2"
            style={{ background: SLATE_HORIZON.bg, borderColor: SLATE_HORIZON.line }}
          >
            <div
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
              style={{ background: SLATE_HORIZON.soft, color: SLATE_HORIZON.brandDeep }}
            >
              {lead.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium" style={{ color: SLATE_HORIZON.ink }}>
                {lead.name}
              </p>
              <p className="text-[10px]" style={{ color: SLATE_HORIZON.muted }}>
                {lead.status}
              </p>
            </div>
            <span className="text-xs font-bold" style={{ color: lead.color }}>
              {lead.score}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', prefersReducedMotion ? '0%' : '15%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const useInlineCapture = process.env.NEXT_PUBLIC_LANDING_HERO_VARIANT !== 'classic';

  return (
    <section
      ref={ref}
      className="relative flex min-h-screen items-center overflow-hidden"
      style={{ background: SLATE_HORIZON.bg, backgroundImage: SLATE_HORIZON.heroAmbient }}
    >
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto w-full max-w-6xl overflow-x-hidden px-4 pb-12 pt-20 sm:px-6 sm:pb-16 sm:pt-24"
      >
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-stretch lg:gap-12">
          <div
            className="flex min-w-0 flex-1 flex-col justify-center rounded-[22px] p-6 text-white sm:p-8 lg:p-10"
            style={{
              background: SLATE_HORIZON.heroGradient,
              boxShadow: '0 20px 50px rgba(8,17,32,0.28)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex w-fit items-center gap-2 rounded-full border px-4 py-1.5 text-sm"
              style={{
                background: 'rgba(255,255,255,0.12)',
                borderColor: 'rgba(255,255,255,0.22)',
                color: '#EFF6FF',
              }}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300" />
              AI Asistent — prediktívny operačný systém pre zisk
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 w-full break-words text-[1.6rem] font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.25rem]"
            >
              Premeňte CRM na stroj,
              <br />
              ktorý generuje mandáty
              <br />
              <span style={{ color: '#93C5FD' }}>skôr než konkurencia zdvihne telefón.</span>
            </motion.h1>

            {useInlineCapture ? (
              <>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="mt-4 max-w-full text-base text-white/85 sm:max-w-lg sm:text-lg"
                >
                  {HERO_SUBHEADLINE}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="mt-5 flex flex-col items-start"
                >
                  <HeroSocialProof />
                  <div className="mt-4">
                    <HeroEmailCapture />
                  </div>
                  <HeroTrustBar />
                </motion.div>
              </>
            ) : (
              <>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="mt-4 max-w-full text-base text-white/85 sm:max-w-lg sm:text-lg"
                >
                  Revolis.AI AI Asistent analyzuje správanie vašej databázy v reálnom čase.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="mt-5 flex flex-col flex-wrap gap-3 sm:flex-row sm:gap-4"
                >
                  <Link
                    href="/register"
                    className={`cursor-pointer rounded-full px-7 py-3.5 text-center text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] ${SLATE_HORIZON.focusRing}`}
                    style={{ background: SLATE_HORIZON.ctaGradient }}
                  >
                    Zistiť hodnotu spiacich kontraktov
                  </Link>
                </motion.div>
              </>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6 flex flex-wrap gap-4 pt-2 text-sm font-medium text-white/90"
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Nasadenie <strong className="text-white">do 30 min</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <RadiantSpriteIcon icon="dashboard" sizeClassName="h-4 w-4" className="rounded-sm shadow-none" />
                <strong className="text-white">30-dňová</strong> garancia vrátenia
              </span>
              <span className="inline-flex items-center gap-1.5">
                <RadiantSpriteIcon icon="pipeline" sizeClassName="h-4 w-4" className="rounded-sm shadow-none" />
                <strong style={{ color: '#93C5FD' }}>+34%</strong> konverzný pomer
              </span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl flex-1 lg:max-w-none"
          >
            <DashboardMock />
            <LiveLeadCounter />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
