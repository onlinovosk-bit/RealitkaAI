"use client";

import Link from "next/link";
import { getLandingCtaCopy } from "@/lib/landing-cta-ab";
import { useCtaAbVariant } from "@/components/landing/CtaAbProvider";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";

/** Hero strip – messaging „AI Asistent / superpower“ pre landing (A/B CTA texty). */
export function HeroSection() {
  const variant = useCtaAbVariant();
  const copy = getLandingCtaCopy(variant);

  return (
    <section
      className="relative overflow-hidden rounded-3xl px-6 py-16 text-center md:px-12"
      style={{
        background: SLATE_HORIZON.heroGradient,
        boxShadow: "0 20px 50px rgba(8,17,32,0.2)",
      }}
      data-ab-variant={variant}
      data-ab-section="hero"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: SLATE_HORIZON.heroAmbient }}
      />
      <div className="relative">
        <p className="mx-auto max-w-3xl text-sm font-semibold text-blue-100">AI Asistent pre makléra a majiteľa realitnej kancelárie</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
          AI, ktorá z Teba spraví lepšieho makléra, lepšieho šéfa
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
          Revolis.AI Asistent robí nudnú prácu za Teba, aby si Ty uzatváral viac obchodov.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-xl px-6 py-3 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 ${SLATE_HORIZON.focusRing}`}
            style={{ background: SLATE_HORIZON.ctaGradient }}
            data-ab-cta="hero-primary"
          >
            {copy.hero.primary}
          </Link>
          <Link
            href="/login"
            className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-xl border px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10 ${SLATE_HORIZON.focusRing}`}
            style={{ borderColor: 'rgba(255,255,255,0.25)' }}
          >
            {copy.hero.secondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
