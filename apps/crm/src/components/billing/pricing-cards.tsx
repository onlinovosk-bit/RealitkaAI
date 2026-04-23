"use client";
import React, { useState, useEffect } from "react";
import { Plus, Zap, Eye, Crown, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { fetchJsonWithRetry } from "@/lib/request-helpers";
import { EmailMockup } from "./EmailMockup";

const ONBOARDING_FEE = 99;

// ─── Cyberpunk farebné identity ───────────────────────────────────────────
const CYBER_CARD = {
  starter: {
    outerClass: "p-[1px] rounded-[2.5rem] bg-gradient-to-b from-white/20 to-transparent",
    outerStyle: {} as React.CSSProperties,
    innerClass: "h-full p-8 rounded-[2.5rem] bg-white/[0.03] backdrop-blur-xl flex flex-col border border-white/5 transition-all duration-500 group-hover:bg-white/[0.06]",
    Icon: Zap,
    iconClass: "text-white/40 mb-4",
    nameClass: "text-[10px] font-black uppercase tracking-[0.3em] text-white/40",
    priceClass: "text-4xl font-black text-white italic tracking-tighter",
    diffClass: "text-[10px] text-white/20 uppercase mt-1 font-bold",
    btnClass: "w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all",
    btnLabel: "Aktivovať",
    scale: "",
  },
  pro: {
    outerClass: "p-[1px] rounded-[2.5rem] bg-gradient-to-b from-purple-500/30 to-transparent",
    outerStyle: { boxShadow: "0 0 40px rgba(168,85,247,0.10)" } as React.CSSProperties,
    innerClass: "h-full p-8 rounded-[2.5rem] bg-purple-500/[0.02] backdrop-blur-xl flex flex-col border border-purple-500/10 transition-all duration-500 group-hover:bg-purple-500/[0.05]",
    Icon: Eye,
    iconClass: "text-purple-400/60 mb-4",
    nameClass: "text-[10px] font-black uppercase tracking-[0.3em] text-purple-400/60",
    priceClass: "text-4xl font-black text-white italic tracking-tighter",
    diffClass: "text-[10px] text-purple-400/30 uppercase mt-1 font-bold",
    btnClass: "w-full py-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-[10px] font-black uppercase tracking-widest hover:bg-purple-500/20 transition-all",
    btnLabel: "✦ Aktivovať",
    scale: "",
  },
  market: {
    outerClass: "p-[1px] rounded-[2.5rem] bg-gradient-to-b from-cyan-500/30 to-transparent",
    outerStyle: { boxShadow: "0 0 40px rgba(6,182,212,0.10)" } as React.CSSProperties,
    innerClass: "h-full p-8 rounded-[2.5rem] bg-cyan-500/[0.02] backdrop-blur-xl flex flex-col border border-cyan-500/10 transition-all duration-500 group-hover:bg-cyan-500/[0.05]",
    Icon: Crown,
    iconClass: "text-cyan-400/60 mb-4",
    nameClass: "text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400/60",
    priceClass: "text-4xl font-black text-white italic tracking-tighter",
    diffClass: "text-[10px] text-cyan-400/30 uppercase mt-1 font-bold",
    btnClass: "w-full py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-all",
    btnLabel: "✦ Aktivovať",
    scale: "",
  },
  protocol: {
    outerClass: "p-[2px] rounded-[2.5rem] bg-gradient-to-b from-yellow-500 via-yellow-200 to-yellow-800",
    outerStyle: { boxShadow: "0 0 60px rgba(234,179,8,0.30)" } as React.CSSProperties,
    innerClass: "h-full p-8 rounded-[2.5rem] bg-gradient-to-br from-yellow-600/20 via-[#0a0a05] to-yellow-900/40 backdrop-blur-3xl flex flex-col border border-yellow-500/20 overflow-hidden",
    Icon: ShieldCheck,
    iconClass: "text-yellow-500 mb-4 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]",
    nameClass: "text-[11px] font-black uppercase tracking-[0.4em] text-yellow-500 drop-shadow-sm",
    priceClass: "text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 italic tracking-tighter",
    diffClass: "text-[11px] text-yellow-500/50 uppercase mt-2 font-black tracking-widest italic",
    btnClass: "w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 bg-[length:200%_auto] text-[#010103] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-right transition-all duration-500 animate-gradient",
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
            background: 'rgba(37,99,235,0.12)',
            border: '1px solid rgba(37,99,235,0.35)',
          }}
        >
          <Zap size={14} style={{ color: '#60A5FA', flexShrink: 0 }} />
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#93C5FD' }}>
            Špeciálna autorizácia aktívna — kód <span style={{ color: '#fff' }}>{promoCode}</span> — zľava sa aplikuje pri platbe
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold" style={{ color: '#F0F9FF' }}>
          Vyberte si plán
        </h2>
        <p className="mt-2 text-sm" style={{ color: '#64748B' }}>
          Všetky plány zahŕňajú 100% garanciu vrátenia do 30 dní
        </p>
        <div
          className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-extrabold"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#FCA5A5',
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
      <div className={`grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4 ${isSmolko ? "xl:flex-1" : ""}`}>
        {plans.map((plan) => {
          const isProtocol = plan.key === "protocol";
          const isPro = (plan.key === "pro" || plan.recommended) && !isProtocol;
          const isLoading = loadingKey === plan.key;
          const priceAmount = parseInt(plan.priceLabel) || 0;
          const firstPayment = priceAmount + ONBOARDING_FEE;

          const cyber = CYBER_CARD[plan.key as keyof typeof CYBER_CARD] ?? CYBER_CARD.starter;
          const CyberIcon = cyber.Icon;

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
                <div className={`relative ${cyber.innerClass}`}>

                  {/* Protocol shimmer overlay */}
                  {isProtocol && (
                    <div className="absolute -top-[100%] -left-[100%] w-[300%] h-[300%] bg-gradient-to-br from-transparent via-yellow-500/10 to-transparent rotate-45 animate-shimmer pointer-events-none" />
                  )}

                  {/* Ikona + názov */}
                  <CyberIcon size={isProtocol ? 32 : 24} className={cyber.iconClass} />
                  <div className={`${cyber.nameClass} mb-6`}>{plan.landingName ?? plan.name}</div>

                  {/* Popis */}
                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#475569' }}>
                    {plan.description}
                  </p>

                  {/* Cena */}
                  <div className="mb-3 text-center">
                    {plan.originalPriceLabel && (
                      <p className="text-xs font-bold line-through mb-1" style={{ color: '#64748B' }}>
                        {plan.originalPriceLabel}
                      </p>
                    )}
                    <span className={cyber.priceClass}>{plan.priceLabel}</span>
                    {plan.originalPriceLabel && (
                      <div className="mt-2">
                        <span
                          className="inline-block rounded-full px-3 py-0.5 text-[10px] font-bold"
                          style={{
                            background: isProtocol ? 'rgba(234,179,8,0.15)' : 'rgba(34,211,238,0.12)',
                            color: isProtocol ? '#EAB308' : '#22D3EE',
                            border: `1px solid ${isProtocol ? 'rgba(234,179,8,0.25)' : 'rgba(34,211,238,0.20)'}`,
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

                  {/* Onboarding fee badge */}
                  <div
                    className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1"
                    style={{
                      background: 'rgba(251,146,60,0.10)',
                      border: '1px solid rgba(251,146,60,0.25)',
                      color: '#FB923C',
                    }}
                  >
                    <Plus size={10} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {ONBOARDING_FEE} € jednorazový onboarding
                    </span>
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
                          <span style={{ color: isProtocol ? '#EAB308' : '#22D3EE', flexShrink: 0 }}>✓</span>
                          <span style={{ color: '#94A3B8' }}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Prvá platba spolu */}
                  {priceAmount > 0 && (
                    <div
                      className="mb-4 flex items-center justify-between rounded-2xl px-4 py-3 w-full"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: '#475569' }}>
                        Prvá platba spolu:
                      </span>
                      <span className="text-sm font-bold" style={{ color: '#F0F9FF' }}>
                        {firstPayment} € s DPH
                      </span>
                    </div>
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
                    <p className="mt-4 text-center text-[10px]" style={{ color: '#92400E' }}>
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
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.20)',
            color: '#FCA5A5',
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
          background: 'rgba(34,211,238,0.04)',
          border: '1px solid rgba(34,211,238,0.10)',
        }}
      >
        <div
          className="flex flex-wrap items-center justify-center gap-6 text-xs"
          style={{ color: '#475569' }}
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
