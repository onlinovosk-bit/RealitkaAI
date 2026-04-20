"use client";
import Link from "next/link";
import { useCtaAbVariant } from "./CtaAbProvider";

export function CTASection() {
  const variant = useCtaAbVariant();
  const label = variant === "b" ? "Vyskúšať zadarmo" : "Začať teraz – bezplatne";

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <Link
        href="/register"
        className="rounded-full px-8 py-3.5 text-base font-bold text-slate-950 transition-all hover:scale-[1.02]"
        style={{ background: "linear-gradient(135deg, #22D3EE 0%, #818CF8 100%)", boxShadow: "0 0 32px rgba(34,211,238,0.35)" }}
      >
        {label}
      </Link>
      <p className="text-xs text-slate-500">Bez kreditnej karty · 30-dňová garancia vrátenia</p>
    </div>
  );
}
