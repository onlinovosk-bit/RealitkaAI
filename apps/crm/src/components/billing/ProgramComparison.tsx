"use client";

import Link from "next/link";
import { Fragment } from "react";
import { Check, Minus, TrendingUp } from "lucide-react";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

const PLANS = [
  {
    key: "starter",
    name: "SMART START",
    price: 49,
    accentColor: SLATE_HORIZON.muted,
    cardBg: "#FFFFFF",
    cardBorder: SLATE_HORIZON.line,
    recommended: false,
  },
  {
    key: "pro",
    name: "ACTIVE FORCE",
    price: 99,
    accentColor: SLATE_HORIZON.brandDeep,
    cardBg: "#FFFFFF",
    cardBorder: "#BFDBFE",
    recommended: false,
  },
  {
    key: "market",
    name: "MARKET VISION",
    price: 199,
    accentColor: "#4338CA",
    cardBg: "#FFFFFF",
    cardBorder: "#C7D2FE",
    recommended: false,
  },
  {
    key: "protocol",
    name: "PROTOCOL AUTHORITY",
    price: 449,
    accentColor: "#B45309",
    cardBg: "linear-gradient(160deg, #FFFBEB 0%, #FFFFFF 72%)",
    cardBorder: "#FDE68A",
    recommended: true,
  },
] as const;

type PlanKey = (typeof PLANS)[number]["key"];

type FeatureRow = {
  label: string;
  plans: Partial<Record<PlanKey, boolean | string>>;
};

type Category = {
  title: string;
  features: FeatureRow[];
};

const CATEGORIES: Category[] = [
  {
    title: "ZÁKLADNÉ FUNKCIE",
    features: [
      { label: "AI Asistent (pracovné hodiny)", plans: { starter: true } },
      { label: "AI Asistent 24/7", plans: { pro: true, market: true, protocol: true } },
      { label: "Denný AI briefing o 8:00", plans: { starter: true, pro: true, market: true, protocol: true } },
      { label: "Buyer Readiness Index", plans: { starter: true, pro: true, market: true, protocol: true } },
      { label: "Hot Alert (skóre 75+)", plans: { starter: true, pro: true, market: true, protocol: true } },
      { label: "One-click follow-up", plans: { starter: true, pro: true, market: true, protocol: true } },
    ],
  },
  {
    title: "MAKLÉRI & LICENCIE",
    features: [
      { label: "Počet maklérov", plans: { starter: "Do 3", pro: "1", market: "1 owner + 1 maklér", protocol: "1 owner + 4 makléri" } },
      { label: "Active Force licencia pre makléra", plans: { market: true, protocol: true } },
      { label: "Protocol Authority menu", plans: { protocol: true } },
      { label: "Market Vision menu", plans: { market: true, protocol: true } },
    ],
  },
  {
    title: "AI ANALÝZA & SCORING",
    features: [
      { label: "Prediktívne skórovanie obchodov", plans: { pro: true, market: true, protocol: true } },
      { label: "AI analýza hovorov", plans: { pro: true, market: true, protocol: true } },
      { label: "Detekcia záujmu klienta", plans: { pro: true, market: true, protocol: true } },
      { label: "Teritoriálna inteligencia", plans: { pro: true, market: true, protocol: true } },
      { label: "Automatické follow-upy (7 dní)", plans: { pro: true, market: true, protocol: true } },
      { label: "Hodnotenie výkonnosti maklérov", plans: { market: true, protocol: true } },
    ],
  },
  {
    title: "TÍMOVÉ FUNKCIE",
    features: [
      { label: "Prehľad výkonnosti tímu", plans: { market: true, protocol: true } },
      { label: "Tímový AI mozog", plans: { market: true, protocol: true } },
      { label: "Predpoveď obratu pre tím", plans: { market: true, protocol: true } },
      { label: "Manažérske reporty", plans: { market: true, protocol: true } },
      { label: "Medzitrímová analytika", plans: { protocol: true } },
      { label: "Správa viacerých pobočiek", plans: { protocol: true } },
    ],
  },
  {
    title: "PREDIKTÍVNA INTELIGENCIA",
    features: [
      { label: "Emocionálny skener (obhliadky)", plans: { market: true, protocol: true } },
      { label: "Bod Zlomu — mapa sťahovania", plans: { market: true, protocol: true } },
      { label: "Finančný radar (exekúcie/dlhy)", plans: { protocol: true } },
      { label: "Plánované stavby (stavebné pov.)", plans: { protocol: true } },
      { label: "Zmena v okolí — rast cien", plans: { protocol: true } },
      { label: "Tepelná mapa konkurencie", plans: { protocol: true } },
      { label: "Neurónová spravodajská sieť", plans: { protocol: true } },
    ],
  },
  {
    title: "ŠPECIÁLNE FUNKCIE",
    features: [
      { label: "Prebúdza zabudnutých klientov", plans: { market: true, protocol: true } },
      { label: "Prebúdza zabudnutých klientov — pokročilý režim", plans: { protocol: true } },
      { label: "Štít anonymného režimu", plans: { protocol: true } },
      { label: "Dedikovaný Protocol manažér", plans: { protocol: true } },
      { label: "SLA 99.99% uptime", plans: { protocol: true } },
    ],
  },
  {
    title: "PODPORA & GARANCIA",
    features: [
      { label: "Podpora", plans: { starter: "48h", pro: "Prioritná", market: "Prioritná", protocol: "Dedikovaná" } },
      { label: "30-dňová garancia vrátenia", plans: { starter: true, pro: true, market: true, protocol: true } },
      { label: "Portálové integrácie", plans: { pro: true, market: true, protocol: true } },
    ],
  },
];

function Cell({ value, color }: { value: boolean | string | undefined; color: string }) {
  if (value === undefined || value === false) {
    return <Minus size={14} style={{ color: SLATE_HORIZON.line, margin: "0 auto" }} />;
  }
  if (value === true) {
    return <Check size={14} style={{ color, margin: "0 auto" }} />;
  }
  return (
    <span className="block text-center text-[10px] font-bold uppercase tracking-wide" style={{ color }}>
      {value}
    </span>
  );
}

export default function ProgramComparison() {
  return (
    <div className="min-h-full pb-20" style={{ background: SLATE_HORIZON.bg, color: SLATE_HORIZON.ink }}>
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-12">
        <div className="mb-10">
          <h1 className="mb-3 text-3xl font-black uppercase italic tracking-tight md:text-5xl" style={{ color: SLATE_HORIZON.ink }}>
            POROVNANIE <span style={{ color: SLATE_HORIZON.brand }}>PROGRAMOV</span>
          </h1>
          <p className="text-sm uppercase tracking-wider" style={{ color: SLATE_HORIZON.muted }}>
            Presne vidíš čo získaš navyše a za koľko
          </p>
          <p
            className="mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed"
            style={{
              borderColor: SLATE_HORIZON.softBorder,
              background: SLATE_HORIZON.soft,
              color: SLATE_HORIZON.deep,
            }}
          >
            <strong>Predaj dnes:</strong> Solo / Team / Office seat (79 / 71 / 63 € na makléra).
            Moduly Leads Engine, Market Intelligence, Protocol AI a Active Force Calls sú na roadmape — nie v self-serve checkout.
          </p>
        </div>

        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full border-separate border-spacing-x-1" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th className="w-[260px] pb-6 pr-4 text-left" />
                {PLANS.map((plan, i) => {
                  const prevDiff = i > 0 ? plan.price - PLANS[i - 1].price : 0;
                  return (
                    <th key={plan.key} className="px-3 pb-6 pt-8 text-center" style={{ minWidth: 140 }}>
                      <div
                        className={`relative rounded-2xl px-3 py-5${plan.key === "protocol" ? " z-10 scale-[1.03]" : ""}`}
                        style={{
                          background: plan.cardBg,
                          border: `1px solid ${plan.cardBorder}`,
                          boxShadow:
                            plan.key === "protocol"
                              ? "0 12px 40px rgba(245,158,11,0.15)"
                              : WORKDESK_CARD.boxShadow,
                        }}
                      >
                        {plan.recommended && (
                          <div
                            className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest"
                            style={{
                              background: "linear-gradient(135deg, #F59E0B, #D97706)",
                              color: SLATE_HORIZON.inkDeep,
                              boxShadow: "0 4px 12px rgba(245,158,11,0.25)",
                            }}
                          >
                            NAJPOPULÁRNEJŠÍ
                          </div>
                        )}
                        <div className="mb-1 text-[10px] font-black uppercase tracking-wider" style={{ color: plan.accentColor }}>
                          {plan.name}
                        </div>
                        <div className="text-2xl font-black" style={{ color: SLATE_HORIZON.ink }}>
                          {plan.price} €
                          <span className="text-[10px] font-normal" style={{ color: SLATE_HORIZON.muted }}>
                            /mes
                          </span>
                        </div>

                        {i > 0 && (
                          <div className="mt-2">
                            <div
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold"
                              style={{ background: SLATE_HORIZON.soft, color: plan.accentColor }}
                            >
                              <TrendingUp size={8} />
                              +{prevDiff} € vs {PLANS[i - 1].name.split(" ")[0]}
                            </div>
                          </div>
                        )}

                        <Link
                          href="/billing"
                          className="mt-3 block w-full rounded-xl py-2 text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-90"
                          style={
                            plan.key === "protocol"
                              ? {
                                  background: "linear-gradient(135deg, #F59E0B, #D97706)",
                                  color: SLATE_HORIZON.inkDeep,
                                }
                              : {
                                  background: SLATE_HORIZON.brandDeep,
                                  color: "#FFFFFF",
                                }
                          }
                        >
                          {plan.key === "protocol" ? "★ Aktivovať →" : "Vybrať →"}
                        </Link>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {CATEGORIES.map((cat) => (
                <Fragment key={cat.title}>
                  <tr>
                    <td colSpan={5} className="pb-2 pt-8">
                      <div
                        className="inline-block rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest"
                        style={{ background: SLATE_HORIZON.soft, color: SLATE_HORIZON.brandDeep }}
                      >
                        {cat.title}
                      </div>
                    </td>
                  </tr>

                  {cat.features.map((feature) => (
                    <tr
                      key={feature.label}
                      className="border-b transition-colors hover:bg-white/80"
                      style={{ borderColor: SLATE_HORIZON.line }}
                    >
                      <td className="py-3 pr-4 text-xs uppercase tracking-wide" style={{ color: SLATE_HORIZON.navText }}>
                        {feature.label}
                      </td>
                      {PLANS.map((plan) => (
                        <td
                          key={plan.key}
                          className="px-3 py-3 text-center"
                          style={
                            plan.key === "protocol"
                              ? { background: "rgba(255,251,235,0.55)" }
                              : undefined
                          }
                        >
                          <Cell value={feature.plans[plan.key]} color={plan.accentColor} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="mt-12 rounded-3xl p-8 text-center"
          style={{
            background: "#FFFFFF",
            border: `1px solid ${SLATE_HORIZON.line}`,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <p className="mb-3 text-xs uppercase tracking-widest" style={{ color: SLATE_HORIZON.muted }}>
            Všetky plány obsahujú 30-dňovú garanciu vrátenia. Cena za jednorazový onboarding je 99 € s DPH.
          </p>
          <Link
            href="/billing"
            className="inline-block rounded-xl px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-white transition-opacity hover:opacity-95"
            style={{ background: SLATE_HORIZON.brandDeep }}
          >
            Aktivovať program →
          </Link>
        </div>
      </div>
    </div>
  );
}
