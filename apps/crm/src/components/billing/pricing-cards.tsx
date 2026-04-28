"use client";
import React, { useState, useEffect } from "react";
import { Zap, Eye, Crown, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { fetchJsonWithRetry } from "@/lib/request-helpers";
import { EmailMockup } from "./EmailMockup";

// ─── Premium Banking Palette (luxusný + dôveryhodný variant) ──────────────
const CYBER_CARD = {
  starter: {
    outerClass: "p-[1px] rounded-[2.5rem] bg-gradient-to-b from-slate-300/25 to-transparent",
    outerStyle: { boxShadow: "0 0 22px rgba(15,23,42,0.20)" } as React.CSSProperties,
    innerClass: "h-full p-8 rounded-[2.5rem] bg-[#070A12]/95 backdrop-blur-xl flex flex-col border transition-all duration-500 group-hover:bg-[#0A0E18]/95",
    Icon: ShieldCheck,
    iconClass: "text-slate-300/80 mb-4",
    nameClass: "text-[10px] font-black uppercase tracking-[0.3em] text-slate-200/75",
    priceClass: "text-4xl font-black text-white italic tracking-tighter",
    diffClass: "text-[10px] text-slate-400/70 uppercase mt-1 font-bold",
    btnClass: "w-full py-3 rounded-2xl bg-[#1E293B]/25 border border-[#1E293B]/60 text-slate-100 text-[10px] font-black uppercase tracking-widest hover:bg-[#1E293B]/40 transition-all",
    btnLabel: "Aktivovať",
    scale: "",
  },
  pro: {
    outerClass: "p-[1px] rounded-[2.5rem] bg-gradient-to-b from-blue-400/30 to-transparent",
    outerStyle: { boxShadow: "0 0 30px rgba(30,64,175,0.22)" } as React.CSSProperties,
    innerClass: "h-full p-8 rounded-[2.5rem] bg-[#070A12]/95 backdrop-blur-xl flex flex-col border transition-all duration-500 group-hover:bg-[#0B1020]/95",
    Icon: Eye,
    iconClass: "text-blue-300/80 mb-4",
    nameClass: "text-[10px] font-black uppercase tracking-[0.3em] text-blue-300/75",
    priceClass: "text-4xl font-black text-white italic tracking-tighter",
    diffClass: "text-[10px] text-blue-300/70 uppercase mt-1 font-bold",
    btnClass: "w-full py-3 rounded-2xl bg-[#1E3A8A]/30 border border-[#1E3A8A]/60 text-blue-100 text-[10px] font-black uppercase tracking-widest hover:bg-[#1D4ED8]/35 transition-all",
    btnLabel: "✦ Aktivovať",
    scale: "",
  },
  market: {
    outerClass: "p-[1px] rounded-[2.5rem] bg-gradient-to-b from-cyan-400/25 to-transparent",
    outerStyle: { boxShadow: "0 0 28px rgba(14,116,144,0.20)" } as React.CSSProperties,
    innerClass: "h-full p-8 rounded-[2.5rem] bg-[#070A12]/95 backdrop-blur-xl flex flex-col border transition-all duration-500 group-hover:bg-[#07131A]/95",
    Icon: Crown,
    iconClass: "text-cyan-300/80 mb-4",
    nameClass: "text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300/75",
    priceClass: "text-4xl font-black text-white italic tracking-tighter",
    diffClass: "text-[10px] text-cyan-300/70 uppercase mt-1 font-bold",
    btnClass: "w-full py-3 rounded-2xl bg-[#0E7490]/25 border border-[#0E7490]/60 text-cyan-100 text-[10px] font-black uppercase tracking-widest hover:bg-[#0891B2]/35 transition-all",
    btnLabel: "✦ Aktivovať",
    scale: "",
  },
  protocol: {
    outerClass: "p-[2px] rounded-[2.5rem] bg-gradient-to-b from-amber-200 via-[#D4AF37] to-amber-700",
    outerStyle: { boxShadow: "0 0 42px rgba(212,175,55,0.24)" } as React.CSSProperties,
    innerClass: "h-full p-8 rounded-[2.5rem] bg-[radial-gradient(circle_at_18%_10%,rgba(212,175,55,0.18),rgba(7,10,18,0.98)_40%),radial-gradient(circle_at_85%_18%,rgba(212,175,55,0.10),transparent_42%)] backdrop-blur-3xl flex flex-col border border-amber-300/35 overflow-hidden",
    Icon: ShieldCheck,
    iconClass: "text-amber-300 mb-4 drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]",
    nameClass: "text-[11px] font-black uppercase tracking-[0.4em] text-amber-200 drop-shadow-sm",
    priceClass: "text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-100 to-amber-500 italic tracking-tighter",
    diffClass: "text-[11px] text-amber-300/70 uppercase mt-2 font-black tracking-widest italic",
    btnClass: "w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 bg-[length:200%_auto] text-[#111827] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-right transition-all duration-500 animate-gradient",
    btnLabel: "★ Aktivovať Protocol —",
    scale: "scale-110 z-10",
  },
} as const;

type Plan = {
  key: string;
  name: string;
  landingName?: string;
  priceLabel: string;
  originalPriceLabel?: string;
  description: string;
  billingNote?: string;
  recommended?: boolean;
  features?: string[];
};

export default function PricingCards({ plans }: { plans: Plan[] }) {
  const [loadingKey, setLoadingKey]       = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [promoCode, setPromoCode]         = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;
    const promo = searchParams.get("promo");
    if (promo) setPromoCode(promo.toUpperCase());
  }, [searchParams]);

  function getCheckoutErrorMessage(error: unknown) {
    const fallback = "Nepodarilo sa spustiť checkout.";
    if (!(error instanceof Error)) return fallback;

    const message = error.message || fallback;
    if (
      message.includes("Používateľ nemá email") ||
      message.includes("Pouzivatel nema email")
    ) {
      return "V účte chýba e-mail. Odhláste sa a prihláste sa znova, potom skúste checkout opäť.";
    }
    if (message.includes("Chýba planKey") || message.includes("Chyba planKey")) {
      return "Nepodarilo sa odoslať plán pre checkout. Obnovte stránku a skúste to znovu.";
    }
    if (message.includes("not available to be purchased") || message.includes("not active")) {
      return "Tento plán momentálne nie je dostupný na nákup. Skúste to neskôr alebo kontaktujte podporu.";
    }
    return message;
  }

  async function startCheckout(planKey: string) {
    if (!planKey) {
      setCheckoutError("Nepodarilo sa zvoliť plán pre checkout. Obnovte stránku a skúste to znovu.");
      return;
    }
    setLoadingKey(planKey);
    setCheckoutError(null);
    try {
      const data = await fetchJsonWithRetry(
        "/api/billing/checkout",
        {
          method: "POST",
          body: JSON.stringify({ planKey, promoCode: promoCode ?? undefined }),
        },
        {
          retries: 2,
          backoffMs: 500,
        },
      );
      if (data?.result?.url) {
        window.location.href = data.result.url;
        return;
      }
      setCheckoutError("Stripe checkout URL nebola vrátená. Skontrolujte nastavenie Stripe v administrácii.");
    } catch (error) {
      setCheckoutError(getCheckoutErrorMessage(error));
    } finally {
      setLoadingKey(null);
    }
  }

  const isSmolko = promoCode === "SMOLKO_VIP_50";

  return (
    <div>
      {/* Promo banner */}
      {promoCode && (
        <div
          className="mb-8 flex items-center justify-center gap-3 rounded-2xl p-4 text-center animate-pulse"
          style={{
            background: "rgba(30,64,175,0.14)",
            border: "1px solid rgba(59,130,246,0.35)",
          }}
        >
          <Zap size={14} style={{ color: "#93C5FD", flexShrink: 0 }} />
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: "#BFDBFE" }}>
            Špeciálna autorizácia aktívna — kód <span style={{ color: '#fff' }}>{promoCode}</span> — zľava sa aplikuje pri platbe
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold" style={{ color: "#E2E8F0" }}>
          Vyberte si plán
        </h2>
        <p className="mt-2 text-sm" style={{ color: "#94A3B8" }}>
          Všetky plány zahŕňajú 100% garanciu vrátenia do 30 dní
        </p>
        <div
          className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-extrabold"
          style={{
            background: "rgba(180,83,9,0.16)",
            border: "1px solid rgba(217,119,6,0.35)",
            color: "#FCD34D",
          }}
        >
          🔥 Špeciálna ponuka spustenia — 50% zľava pre prvých 20 realitiek
        </div>
      </div>

      {/* Smolko mockup — mobile: nad kartami */}
      {isSmolko && (
        <div className="xl:hidden mb-8">
          <EmailMockup />
        </div>
      )}

      {/* Cards + desktop mockup wrapper */}
      <div className={isSmolko ? "flex flex-col xl:flex-row gap-10 items-start" : ""}>
      <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 ${isSmolko ? "xl:flex-1" : ""}`}>
        {plans.map((plan) => {
          const isProtocol = plan.key === "protocol";
          const isPro = (plan.key === "pro" || plan.recommended) && !isProtocol;
          const isLoading = loadingKey === plan.key;
          const priceAmount = parseInt(plan.priceLabel) || 0;
          const cyber = CYBER_CARD[plan.key as keyof typeof CYBER_CARD] ?? CYBER_CARD.starter;
          const CyberIcon = cyber.Icon;
          const cardBorderColor =
            plan.key === "starter"
              ? "rgba(30,41,59,0.55)"
              : plan.key === "pro"
                ? "rgba(49,46,129,0.55)"
                : plan.key === "market"
                  ? "rgba(6,78,59,0.55)"
                  : "rgba(234,179,8,0.28)";

          return (
            <div key={plan.key} className={`relative group ${cyber.scale}`}>
              {/* Protocol Authority — NAJPOPULÁRNEJŠÍ badge */}
              {isProtocol && (
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-5 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap animate-pulse z-20 italic"
                  style={{
                    background: 'linear-gradient(135deg, #EAB308, #CA8A04)',
                    color: '#010103',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.5), 0 0 20px rgba(234,179,8,0.40)',
                    border: '1px solid rgba(254,240,138,0.3)',
                  }}
                >
                  ⭐ Najpopulárnejší
                </div>
              )}

              {/* Gradient border wrapper */}
              <div className={cyber.outerClass} style={cyber.outerStyle}>
                <div className={`relative ${cyber.innerClass}`} style={{ borderColor: cardBorderColor }}>

                  {/* Protocol shimmer overlay */}
                  {isProtocol && (
                    <div className="absolute -top-[100%] -left-[100%] w-[300%] h-[300%] bg-gradient-to-br from-transparent via-yellow-500/10 to-transparent rotate-45 animate-shimmer pointer-events-none" />
                  )}

                  {/* Ikona + názov */}
                  <CyberIcon size={isProtocol ? 32 : 24} className={cyber.iconClass} />
                  <div className={`${cyber.nameClass} mb-6`}>{plan.landingName ?? plan.name}</div>

                  {/* Popis */}
                  <p className="text-sm leading-relaxed mb-4" style={{ color: "#94A3B8" }}>
                    {plan.description}
                  </p>

                  {/* Cena */}
                  <div className="mb-3 text-center">
                    {plan.originalPriceLabel && (
                      <p className="text-xs font-bold line-through mb-1" style={{ color: "#64748B" }}>
                        {plan.originalPriceLabel}
                      </p>
                    )}
                    <span className={cyber.priceClass}>{plan.priceLabel}</span>
                    {plan.originalPriceLabel && (
                      <div className="mt-2">
                        <span
                          className="inline-block rounded-full px-3 py-0.5 text-[10px] font-bold"
                          style={{
                            background: isProtocol ? "rgba(212,175,55,0.18)" : "rgba(59,130,246,0.14)",
                            color: isProtocol ? "#FCD34D" : "#93C5FD",
                            border: `1px solid ${isProtocol ? "rgba(212,175,55,0.30)" : "rgba(59,130,246,0.28)"}`,
                          }}
                        >
                          −50% zľava
                        </span>
                      </div>
                    )}
                    {/* diff vs nižší plán */}
                    {priceAmount > 0 && (
                      <div className={`${cyber.diffClass} mt-2`}>
                        {plan.key === 'pro'      && '+ 50 € vs Smart Start'}
                        {plan.key === 'market'   && '+ 100 € vs Active Force'}
                        {plan.key === 'protocol' && '+ 250 € vs Market Vision'}
                      </div>
                    )}
                  </div>

                  {/* Billing note */}
                  {plan.billingNote && (
                    <p className="mb-4 text-xs leading-relaxed" style={{ color: '#334155' }}>
                      {plan.billingNote}
                    </p>
                  )}

                  {/* Features */}
                  {plan.features && plan.features.length > 0 && (
                    <ul className="mb-6 space-y-2 flex-1 w-full">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-xs">
                          <span style={{ color: isProtocol ? "#FCD34D" : "#93C5FD", flexShrink: 0 }}>✓</span>
                          <span style={{ color: "#CBD5E1" }}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* CTA Button */}
                  <button
                    type="button"
                    onClick={() => startCheckout(plan.key)}
                    disabled={isLoading}
                    className={`${cyber.btnClass} disabled:opacity-60 mt-auto`}
                  >
                    {isLoading ? "Presmerovávam..." : cyber.btnLabel}
                  </button>

                  {isProtocol && (
                    <p className="mt-4 text-center text-[10px]" style={{ color: "#FBBF24" }}>
                      💡 100% garancia vrátenia do 30 dní
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Smolko mockup — desktop: vpravo */}
      {isSmolko && (
        <div className="hidden xl:block xl:w-[380px] flex-shrink-0 sticky top-8">
          <EmailMockup />
        </div>
      )}
      </div>{/* end isSmolko wrapper */}

      {checkoutError && (
        <div
          className="mt-6 rounded-2xl p-4 text-center text-sm"
          style={{
            background: "rgba(220,38,38,0.10)",
            border: "1px solid rgba(248,113,113,0.25)",
            color: "#FCA5A5",
          }}
        >
          {checkoutError}
          <p className="mt-2 text-xs text-red-200/90">
            Ak ide o dočasný výpadok, skúste znova o pár sekúnd. Checkout používa automatický retry.
          </p>
        </div>
      )}

      {/* Trust signals */}
      <div
        className="mt-8 rounded-2xl p-5 text-center"
        style={{
          background: "rgba(30,58,138,0.12)",
          border: "1px solid rgba(59,130,246,0.18)",
        }}
      >
        <div
          className="flex flex-wrap items-center justify-center gap-6 text-xs"
          style={{ color: "#CBD5E1" }}
        >
          <span>✓ Bez viazanosti</span>
          <span>✓ Zrušenie kedykoľvek</span>
          <span>✓ GDPR compliant</span>
          <span>✓ Bezpečná platba cez Stripe</span>
          <span>✓ 🇸🇰 Made in Slovakia</span>
        </div>
      </div>
    </div>
  );
}
