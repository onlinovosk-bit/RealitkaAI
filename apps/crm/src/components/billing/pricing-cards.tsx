"use client";
import React, { useState, useEffect } from "react";
import { Zap, Eye, Crown, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { fetchJsonWithRetry } from "@/lib/request-helpers";
import { EmailMockup } from "./EmailMockup";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

const ENTERPRISE_CARD = {
  starter: {
    outerClass: "rounded-[2rem] border",
    outerStyle: { boxShadow: WORKDESK_CARD.boxShadow, borderColor: SLATE_HORIZON.line } as React.CSSProperties,
    innerClass: "h-full p-8 rounded-[2rem] bg-white flex flex-col transition-all duration-300",
    Icon: ShieldCheck,
    iconClass: "text-slate-500 mb-4",
    nameClass: "text-[10px] font-black uppercase tracking-[0.3em] text-slate-500",
    priceClass: "text-4xl font-black italic tracking-tighter",
    priceStyle: { color: SLATE_HORIZON.ink } as React.CSSProperties,
    diffClass: "text-[10px] uppercase mt-1 font-bold",
    diffStyle: { color: SLATE_HORIZON.muted } as React.CSSProperties,
    btnClass: "w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-90",
    btnStyle: { background: SLATE_HORIZON.bg, border: `1px solid ${SLATE_HORIZON.line}`, color: SLATE_HORIZON.ink } as React.CSSProperties,
    btnLabel: "Aktivovať",
    scale: "",
  },
  pro: {
    outerClass: "rounded-[2rem] border",
    outerStyle: { boxShadow: WORKDESK_CARD.boxShadow, borderColor: "#BFDBFE" } as React.CSSProperties,
    innerClass: "h-full p-8 rounded-[2rem] bg-white flex flex-col transition-all duration-300",
    Icon: Eye,
    iconClass: "text-blue-600 mb-4",
    nameClass: "text-[10px] font-black uppercase tracking-[0.3em] text-blue-700",
    priceClass: "text-4xl font-black italic tracking-tighter",
    priceStyle: { color: SLATE_HORIZON.brandDeep } as React.CSSProperties,
    diffClass: "text-[10px] uppercase mt-1 font-bold",
    diffStyle: { color: SLATE_HORIZON.brandDeep } as React.CSSProperties,
    btnClass: "w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all hover:opacity-90",
    btnStyle: { background: SLATE_HORIZON.brandDeep } as React.CSSProperties,
    btnLabel: "Aktivovať",
    scale: "",
  },
  market: {
    outerClass: "rounded-[2rem] border",
    outerStyle: { boxShadow: WORKDESK_CARD.boxShadow, borderColor: "#C7D2FE" } as React.CSSProperties,
    innerClass: "h-full p-8 rounded-[2rem] bg-white flex flex-col transition-all duration-300",
    Icon: Crown,
    iconClass: "text-indigo-600 mb-4",
    nameClass: "text-[10px] font-black uppercase tracking-[0.3em] text-indigo-700",
    priceClass: "text-4xl font-black italic tracking-tighter",
    priceStyle: { color: "#4338CA" } as React.CSSProperties,
    diffClass: "text-[10px] uppercase mt-1 font-bold",
    diffStyle: { color: "#4338CA" } as React.CSSProperties,
    btnClass: "w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all hover:opacity-90",
    btnStyle: { background: "#4338CA" } as React.CSSProperties,
    btnLabel: "Aktivovať",
    scale: "",
  },
  protocol: {
    outerClass: "rounded-[2rem] border-2",
    outerStyle: { boxShadow: "0 12px 40px rgba(245,158,11,0.15)", borderColor: "#FDE68A" } as React.CSSProperties,
    innerClass: "h-full p-8 rounded-[2rem] flex flex-col overflow-hidden",
    innerStyle: { background: "linear-gradient(160deg, #FFFBEB 0%, #FFFFFF 72%)" } as React.CSSProperties,
    Icon: ShieldCheck,
    iconClass: "text-amber-600 mb-4",
    nameClass: "text-[11px] font-black uppercase tracking-[0.4em] text-amber-700",
    priceClass: "text-5xl font-black italic tracking-tighter",
    priceStyle: { color: "#B45309" } as React.CSSProperties,
    diffClass: "text-[11px] uppercase mt-2 font-black tracking-widest italic",
    diffStyle: { color: "#B45309" } as React.CSSProperties,
    btnClass: "w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:opacity-90",
    btnStyle: { background: "linear-gradient(135deg, #F59E0B, #D97706)", color: SLATE_HORIZON.inkDeep } as React.CSSProperties,
    btnLabel: "★ Aktivovať Protocol",
    scale: "scale-[1.03] z-10",
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
          className="mb-8 flex items-center justify-center gap-3 rounded-2xl border p-4 text-center"
          style={{
            background: SLATE_HORIZON.soft,
            borderColor: SLATE_HORIZON.softBorder,
          }}
        >
          <Zap size={14} style={{ color: SLATE_HORIZON.brandDeep, flexShrink: 0 }} />
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: SLATE_HORIZON.brandDeep }}>
            Špeciálna autorizácia aktívna — kód <span style={{ color: SLATE_HORIZON.ink }}>{promoCode}</span> — zľava sa aplikuje pri platbe
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>
          Vyberte si plán
        </h2>
        <p className="mt-2 text-sm" style={{ color: SLATE_HORIZON.muted }}>
          Všetky plány zahŕňajú 100% garanciu vrátenia do 30 dní
        </p>
        <div
          className="mt-4 inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-extrabold"
          style={{
            background: "#FFFBEB",
            borderColor: "#FDE68A",
            color: "#B45309",
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
          const isLoading = loadingKey === plan.key;
          const priceAmount = parseInt(plan.priceLabel) || 0;
          const card = ENTERPRISE_CARD[plan.key as keyof typeof ENTERPRISE_CARD] ?? ENTERPRISE_CARD.starter;
          const CardIcon = card.Icon;

          return (
            <div key={plan.key} className={`relative group ${card.scale}`}>
              {isProtocol && (
                <div
                  className="absolute -top-4 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-5 py-1.5 text-[10px] font-black uppercase italic tracking-[0.2em]"
                  style={{
                    background: "linear-gradient(135deg, #F59E0B, #D97706)",
                    color: SLATE_HORIZON.inkDeep,
                    boxShadow: "0 4px 12px rgba(245,158,11,0.25)",
                  }}
                >
                  ⭐ Najpopulárnejší
                </div>
              )}

              <div className={card.outerClass} style={card.outerStyle}>
                <div
                  className={`relative ${card.innerClass}`}
                  style={"innerStyle" in card ? card.innerStyle : undefined}
                >
                  <CardIcon size={isProtocol ? 32 : 24} className={card.iconClass} />
                  <div className={`${card.nameClass} mb-6`}>{plan.landingName ?? plan.name}</div>

                  <p className="mb-4 text-sm leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
                    {plan.description}
                  </p>

                  <div className="mb-3 text-center">
                    {plan.originalPriceLabel && (
                      <p className="mb-1 text-xs font-bold line-through" style={{ color: SLATE_HORIZON.muted }}>
                        {plan.originalPriceLabel}
                      </p>
                    )}
                    <span className={card.priceClass} style={card.priceStyle}>
                      {plan.priceLabel}
                    </span>
                    {plan.originalPriceLabel && (
                      <div className="mt-2">
                        <span
                          className="inline-block rounded-full border px-3 py-0.5 text-[10px] font-bold"
                          style={{
                            background: isProtocol ? "#FFFBEB" : SLATE_HORIZON.soft,
                            color: isProtocol ? "#B45309" : SLATE_HORIZON.brandDeep,
                            borderColor: isProtocol ? "#FDE68A" : SLATE_HORIZON.softBorder,
                          }}
                        >
                          −50% zľava
                        </span>
                      </div>
                    )}
                    {priceAmount > 0 && (
                      <div className={`${card.diffClass} mt-2`} style={card.diffStyle}>
                        {plan.key === "pro" && "+ 50 € vs Smart Start"}
                        {plan.key === "market" && "+ 100 € vs Active Force"}
                        {plan.key === "protocol" && "+ 250 € vs Market Vision"}
                      </div>
                    )}
                  </div>

                  {plan.billingNote && (
                    <p className="mb-4 text-xs leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
                      {plan.billingNote}
                    </p>
                  )}

                  {plan.features && plan.features.length > 0 && (
                    <ul className="mb-6 flex-1 w-full space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-xs">
                          <span style={{ color: isProtocol ? "#B45309" : SLATE_HORIZON.brandDeep, flexShrink: 0 }}>✓</span>
                          <span style={{ color: SLATE_HORIZON.navText }}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    onClick={() => startCheckout(plan.key)}
                    disabled={isLoading}
                    className={`${card.btnClass} mt-auto disabled:opacity-60`}
                    style={card.btnStyle}
                  >
                    {isLoading ? "Presmerovávam..." : card.btnLabel}
                  </button>

                  {isProtocol && (
                    <p className="mt-4 text-center text-[10px]" style={{ color: "#B45309" }}>
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
          className="mt-6 rounded-2xl border p-4 text-center text-sm"
          style={{
            background: "#FEF2F2",
            borderColor: "#FECACA",
            color: SLATE_HORIZON.danger,
          }}
        >
          {checkoutError}
          <p className="mt-2 text-xs" style={{ color: SLATE_HORIZON.muted }}>
            Ak ide o dočasný výpadok, skúste znova o pár sekúnd. Checkout používa automatický retry.
          </p>
        </div>
      )}

      {/* Trust signals */}
      <div
        className="mt-8 rounded-2xl border p-5 text-center"
        style={{
          background: WORKDESK_CARD.background,
          borderColor: WORKDESK_CARD.borderColor,
          boxShadow: WORKDESK_CARD.boxShadow,
        }}
      >
        <div
          className="flex flex-wrap items-center justify-center gap-6 text-xs"
          style={{ color: SLATE_HORIZON.navText }}
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
