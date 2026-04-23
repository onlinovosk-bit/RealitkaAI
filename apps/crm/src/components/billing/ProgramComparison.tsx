"use client";

import { Check, Minus, TrendingUp } from "lucide-react";

// ─── Plány ────────────────────────────────────────────────────────────────
// Nordic Slate paleta — gradácia od tmavej po svetlú; Authority je zlatá anomália
const PLANS = [
  { key: "starter",  name: "SMART START",       price: 49,  color: "#64748B", accent: "#0F172A",                                                     border: "rgba(100,116,139,0.40)", recommended: false },
  { key: "pro",      name: "ACTIVE FORCE",       price: 99,  color: "#60A5FA", accent: "#1E293B",                                                     border: "rgba(96,165,250,0.25)",  recommended: false },
  { key: "market",   name: "MARKET VISION",      price: 199, color: "#CBD5E1", accent: "#334155",                                                     border: "rgba(203,213,225,0.20)", recommended: false },
  { key: "protocol", name: "PROTOCOL AUTHORITY", price: 449, color: "#EAB308", accent: "linear-gradient(160deg, #451a03 0%, #010103 100%)",           border: "rgba(234,179,8,0.50)",  recommended: true  },
];

type PlanKey = "starter" | "pro" | "market" | "protocol";

// ─── Kategórie a funkcie ──────────────────────────────────────────────────
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
      { label: "AI Asistent (pracovné hodiny)",     plans: { starter: true } },
      { label: "AI Asistent 24/7",                  plans: { pro: true, market: true, protocol: true } },
      { label: "Denný AI briefing o 8:00",          plans: { starter: true, pro: true, market: true, protocol: true } },
      { label: "Buyer Readiness Index",             plans: { starter: true, pro: true, market: true, protocol: true } },
      { label: "Hot Alert (skóre 75+)",             plans: { starter: true, pro: true, market: true, protocol: true } },
      { label: "One-click follow-up",              plans: { starter: true, pro: true, market: true, protocol: true } },
    ],
  },
  {
    title: "MAKLÉRI & LICENCIE",
    features: [
      { label: "Počet maklérov",                    plans: { starter: "Do 3", pro: "1", market: "1 owner + 1 maklér", protocol: "1 owner + 4 makléri" } },
      { label: "Active Force licencia pre makléra", plans: { market: true, protocol: true } },
      { label: "Protocol Authority menu",           plans: { protocol: true } },
      { label: "Market Vision menu",                plans: { market: true, protocol: true } },
    ],
  },
  {
    title: "AI ANALÝZA & SCORING",
    features: [
      { label: "Prediktívne skórovanie obchodov",   plans: { pro: true, market: true, protocol: true } },
      { label: "AI analýza hovorov",                plans: { pro: true, market: true, protocol: true } },
      { label: "Detekcia záujmu klienta",           plans: { pro: true, market: true, protocol: true } },
      { label: "Teritoriálna inteligencia",         plans: { pro: true, market: true, protocol: true } },
      { label: "Automatické follow-upy (7 dní)",    plans: { pro: true, market: true, protocol: true } },
      { label: "Hodnotenie výkonnosti maklérov",    plans: { market: true, protocol: true } },
    ],
  },
  {
    title: "TÍMOVÉ FUNKCIE",
    features: [
      { label: "Prehľad výkonnosti tímu",           plans: { market: true, protocol: true } },
      { label: "Tímový AI mozog",                   plans: { market: true, protocol: true } },
      { label: "Predpoveď obratu pre tím",          plans: { market: true, protocol: true } },
      { label: "Manažérske reporty",                plans: { market: true, protocol: true } },
      { label: "Medzitrímová analytika",            plans: { protocol: true } },
      { label: "Správa viacerých pobočiek",         plans: { protocol: true } },
    ],
  },
  {
    title: "PREDIKTÍVNA INTELIGENCIA",
    features: [
      { label: "Emocionálny skener (obhliadky)",    plans: { market: true, protocol: true } },
      { label: "Bod Zlomu — mapa sťahovania",       plans: { market: true, protocol: true } },
      { label: "Finančný radar (exekúcie/dlhy)",    plans: { protocol: true } },
      { label: "Plánované stavby (stavebné pov.)",  plans: { protocol: true } },
      { label: "Zmena v okolí — rast cien",         plans: { protocol: true } },
      { label: "Tepelná mapa konkurencie",          plans: { protocol: true } },
      { label: "Neurónová spravodajská sieť",       plans: { protocol: true } },
    ],
  },
  {
    title: "ŠPECIÁLNE FUNKCIE",
    features: [
      { label: "Prebúdza zabudnutých klientov",     plans: { market: true, protocol: true } },
      { label: "Prebúdza zabudnutých klientov — pokročilý režim", plans: { protocol: true } },
      { label: "Štít anonymného režimu",            plans: { protocol: true } },
      { label: "Dedikovaný Protocol manažér",       plans: { protocol: true } },
      { label: "SLA 99.99% uptime",                 plans: { protocol: true } },
    ],
  },
  {
    title: "PODPORA & GARANCIA",
    features: [
      { label: "Podpora",                           plans: { starter: "48h", pro: "Prioritná", market: "Prioritná", protocol: "Dedikovaná" } },
      { label: "30-dňová garancia vrátenia",        plans: { starter: true, pro: true, market: true, protocol: true } },
      { label: "Portálové integrácie",              plans: { pro: true, market: true, protocol: true } },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────
function Cell({ value, color }: { value: boolean | string | undefined; color: string }) {
  if (value === undefined || value === false) {
    return <Minus size={14} style={{ color: "#1E293B", margin: "0 auto" }} />;
  }
  if (value === true) {
    return <Check size={14} style={{ color, margin: "0 auto" }} />;
  }
  return (
    <span className="text-[10px] font-bold uppercase tracking-wide text-center block" style={{ color }}>
      {value}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────
export default function ProgramComparison() {
  return (
    <div className="min-h-screen bg-[#010103] text-slate-200 pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tight text-white mb-3">
            POROVNANIE <span className="text-blue-500">PROGRAMOV</span>
          </h1>
          <p className="text-slate-500 text-sm uppercase tracking-wider">
            Presne vidíš čo získaš navyše a za koľko
          </p>
        </div>

        {/* Sticky plan headers */}
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full border-separate border-spacing-x-1" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                {/* Feature label column */}
                <th className="text-left pb-6 pr-4 w-[260px]" />

                {PLANS.map((plan, i) => {
                  const prevDiff = i > 0 ? plan.price - PLANS[i - 1].price : 0;
                  return (
                    <th key={plan.key} className="pt-8 pb-6 px-3 text-center" style={{ minWidth: 140 }}>
                      <div
                        className={`rounded-2xl px-3 py-5 relative${plan.key === "protocol" ? " scale-[1.04] z-10" : ""}`}
                        style={{
                          background: plan.accent,
                          border: `1px solid ${plan.border}`,
                          boxShadow: plan.key === "protocol" ? "0 0 30px rgba(202,138,4,0.20)" : undefined,
                        }}
                      >
                        {plan.recommended && (
                          <div
                            className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap animate-pulse"
                            style={{
                              background: "linear-gradient(135deg, #EAB308, #CA8A04)",
                              color: "#010103",
                              boxShadow: "0 0 12px rgba(234,179,8,0.50)",
                            }}
                          >
                            NAJPOPULÁRNEJŠÍ
                          </div>
                        )}
                        <div className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: plan.color }}>
                          {plan.name}
                        </div>
                        <div className="text-2xl font-black text-white">
                          {plan.price} €
                          <span className="text-[10px] text-slate-500 font-normal">/mes</span>
                        </div>

                        {/* Cenový rozdiel — iba voči o úroveň nižšiemu */}
                        {i > 0 && (
                          <div className="mt-2">
                            <div
                              className="text-[9px] font-bold rounded-full px-2 py-0.5 inline-flex items-center gap-1"
                              style={{ background: `${plan.color}18`, color: plan.color }}
                            >
                              <TrendingUp size={8} />
                              +{prevDiff} € vs {PLANS[i - 1].name.split(" ")[0]}
                            </div>
                          </div>
                        )}

                        <a
                          href="/billing"
                          className="mt-3 block w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-80"
                          style={
                            plan.key === "protocol"
                              ? { background: "linear-gradient(135deg, #EAB308, #CA8A04)", color: "#010103", boxShadow: "0 0 16px rgba(234,179,8,0.35)" }
                              : { background: plan.color, color: "#010103" }
                          }
                        >
                          {plan.key === "protocol" ? "★ Aktivovať →" : "Vybrať →"}
                        </a>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {CATEGORIES.map((cat) => (
                <>
                  {/* Category header */}
                  <tr key={`cat-${cat.title}`}>
                    <td colSpan={5} className="pt-8 pb-2">
                      <div
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg inline-block"
                        style={{ background: "rgba(255,255,255,0.04)", color: "#334155" }}
                      >
                        {cat.title}
                      </div>
                    </td>
                  </tr>

                  {/* Feature rows */}
                  {cat.features.map((feature) => (
                    <tr
                      key={feature.label}
                      className="border-b transition-colors hover:bg-white/[0.02]"
                      style={{ borderColor: "rgba(255,255,255,0.04)" }}
                    >
                      <td className="py-3 pr-4 text-xs text-slate-400 uppercase tracking-wide">
                        {feature.label}
                      </td>
                      {PLANS.map((plan) => (
                        <td
                          key={plan.key}
                          className="py-3 px-3 text-center"
                          style={plan.key === "protocol" ? {
                            background: "rgba(234,179,8,0.04)",
                            borderBottom: "1px solid rgba(234,179,8,0.10)",
                          } : undefined}
                        >
                          <Cell value={feature.plans[plan.key as PlanKey]} color={plan.color} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom CTA */}
        <div
          className="mt-12 p-8 rounded-3xl text-center"
          style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.20)" }}
        >
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
            Všetky plány obsahujú 30-dňovú garanciu vrátenia + jednorazový onboarding 99 €
          </p>
          <a
            href="/billing"
            className="inline-block px-8 py-3.5 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
          >
            Aktivovať program →
          </a>
        </div>

      </div>
    </div>
  );
}
