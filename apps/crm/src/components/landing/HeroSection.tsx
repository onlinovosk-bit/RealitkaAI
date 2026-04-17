"use client";

import Link from "next/link";
import { getLandingCtaCopy } from "@/lib/landing-cta-ab";
import { useCtaAbVariant } from "@/components/landing/CtaAbProvider";

/** Hero strip – messaging „AI Asistent / superpower“ pre landing (A/B CTA texty). */
export function HeroSection() {
  const variant = useCtaAbVariant();
  const copy = getLandingCtaCopy(variant);

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/90 via-slate-950 to-indigo-950/80 px-6 py-16 text-center md:px-12"
      data-ab-variant={variant}
      data-ab-section="hero"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(34,211,238,0.25), transparent 55%)",
        }}
      />
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300/90">
          AI Asistent · Codai
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
          AI, ktorá z teba spraví lepšieho makléra
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
          Revolis.AI robí nudnú prácu za teba, aby si ty uzatváral viac obchodov.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
            data-ab-cta="hero-primary"
          >
            {copy.hero.primary}
          </Link>
          <Link
            href="/login"
            className="inline-flex rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
          >
            {copy.hero.secondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
