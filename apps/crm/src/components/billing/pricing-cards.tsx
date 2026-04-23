"use client";
import { useState, useEffect } from "react";
import { Plus, Zap } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { fetchJsonWithRetry } from "@/lib/request-helpers";
import { EmailMockup } from "./EmailMockup";

const ONBOARDING_FEE = 99;

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
          const isPro = plan.key === "pro" || plan.recommended;
          const isEnterprise = plan.key === "enterprise";
          const isLoading = loadingKey === plan.key;
          const priceAmount = parseInt(plan.priceLabel) || 0;
          const firstPayment = priceAmount + ONBOARDING_FEE;

          return (
            <div
              key={plan.key}
              className="relative rounded-3xl p-8 flex flex-col transition-all duration-300"
              style={
                isPro
                  ? {
                      background: 'linear-gradient(135deg, #0D2137 0%, #1B3A6B 100%)',
                      border: '2px solid #22D3EE',
                      boxShadow: '0 0 40px rgba(34,211,238,0.15)',
                    }
                  : {
                      background: '#0A1628',
                      border: `1px solid ${isEnterprise ? '#1B4FD8' : '#112240'}`,
                    }
              }
            >
              {/* Odporúčané badge */}
              {isPro && (
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-5 py-1.5 text-xs font-bold whitespace-nowrap"
                  style={{
                    background: 'linear-gradient(135deg, #22D3EE, #818CF8)',
                    color: '#050914',
                  }}
                >
                  ⭐ NAJPOPULÁRNEJŠÍ
                </div>
              )}

              {/* Názov */}
              <h2
                className="text-xl mb-2"
                style={{
                  color: '#FFFFFF',
                  fontWeight: isPro ? 700 : 800,
                  fontSize: isPro ? undefined : '1.35rem',
                  letterSpacing: isPro ? undefined : '0.02em',
                }}
              >
                {plan.landingName ?? plan.name}
              </h2>

              {/* Popis */}
              <p className="text-base leading-relaxed mb-4 sm:text-[17px]" style={{ color: '#64748B' }}>
                {plan.description}
              </p>

              {/* Cena */}
              <div className="mb-2">
                {plan.originalPriceLabel && (
                  <p className="text-sm font-bold line-through mb-1" style={{ color: '#94A3B8' }}>
                    {plan.originalPriceLabel}
                  </p>
                )}
                <p
                  className="text-4xl font-extrabold"
                  style={{ color: isPro ? '#22D3EE' : '#F0F9FF' }}
                >
                  {plan.priceLabel}
                </p>
                {plan.originalPriceLabel && (
                  <span
                    className="mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-bold"
                    style={{
                      background: 'rgba(34,211,238,0.12)',
                      color: '#22D3EE',
                      border: '1px solid rgba(34,211,238,0.20)',
                    }}
                  >
                    −50% zľava
                  </span>
                )}

                {/* Onboarding fee badge */}
                <div
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1"
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
              </div>

              {/* Billing note */}
              {plan.billingNote && (
                <p className="mb-6 text-sm leading-relaxed sm:text-base" style={{ color: '#475569' }}>
                  {plan.billingNote}
                </p>
              )}

              {/* Features */}
              {plan.features && plan.features.length > 0 && (
                <ul className="mb-8 space-y-2.5 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-base sm:text-[17px]">
                      <span style={{ color: '#22D3EE', flexShrink: 0 }}>✓</span>
                      <span style={{ color: '#94A3B8' }}>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Prvá platba spolu */}
              {priceAmount > 0 && (
                <div
                  className="mb-4 flex items-center justify-between rounded-2xl px-4 py-3"
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
                className="w-full rounded-xl px-5 py-3.5 text-sm font-bold transition-all duration-200 disabled:opacity-60 hover:opacity-90 mt-auto"
                style={
                  isPro
                    ? {
                        background: 'linear-gradient(135deg, #22D3EE, #818CF8)',
                        color: '#050914',
                        boxShadow: '0 0 20px rgba(34,211,238,0.3)',
                      }
                    : {
                        background: 'rgba(34,211,238,0.08)',
                        border: '1px solid rgba(34,211,238,0.20)',
                        color: '#22D3EE',
                      }
                }
              >
                {isLoading
                  ? "Presmerovávam..."
                  : isPro
                  ? "✦ Vybrať Pro"
                  : isEnterprise
                  ? "Enterprise"
                  : "Vybrať Starter"}
              </button>

              {isPro && (
                <p className="mt-4 text-center text-xs" style={{ color: '#475569' }}>
                  💡 100% garancia vrátenia do 30 dní
                </p>
              )}
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
