"use client";

import Link from "next/link";
import { useCtaAbVariant } from "./CtaAbProvider";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";

export function CTASection() {
  const variant = useCtaAbVariant();
  const label = variant === "b" ? "Vyskúšať zadarmo" : "Začať teraz – bezplatne";

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <Link
        href="/register"
        className={`cursor-pointer rounded-full px-8 py-3.5 text-base font-bold text-white transition-all duration-200 hover:opacity-90 ${SLATE_HORIZON.focusRing}`}
        style={{ background: SLATE_HORIZON.ctaGradient }}
      >
        {label}
      </Link>
      <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
        Bez kreditnej karty · 30-dňová garancia vrátenia
      </p>
    </div>
  );
}
