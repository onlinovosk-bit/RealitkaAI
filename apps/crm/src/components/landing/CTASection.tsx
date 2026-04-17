"use client";

import Link from "next/link";
import { getLandingCtaCopy } from "@/lib/landing-cta-ab";
import { useCtaAbVariant } from "@/components/landing/CtaAbProvider";

export function CTASection() {
  const variant = useCtaAbVariant();
  const copy = getLandingCtaCopy(variant);

  return (
    <section
      className="rounded-3xl border border-cyan-500/25 bg-gradient-to-r from-cyan-950/50 to-indigo-950/40 px-6 py-14 text-center"
      data-ab-variant={variant}
      data-ab-section="final-cta"
    >
      <h2 className="text-2xl font-bold text-white md:text-3xl">{copy.finalCta.title}</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">{copy.finalCta.subtitle}</p>
      <Link
        href="/register"
        className="mt-8 inline-flex rounded-xl bg-cyan-500 px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-400"
        data-ab-cta="final-primary"
      >
        {copy.finalCta.button}
      </Link>
    </section>
  );
}
