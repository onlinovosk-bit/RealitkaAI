"use client";
import { memo } from "react";

const PLAN_FEATURES = {
  starter: [
    "🤖 AI Asistent – odpovede do 2 minút (pracovné hodiny)",
    "📊 Buyer Readiness Index – AI skóre každej príležitosti",
    "📋 Denný AI briefing o 8:00 – 5 priorít každé ráno",
    "🔔 Hot Alert – notifikácia pri skóre 75+",
    "📈 Týždenný konverzný report",
    "✅ Revolis Academy – 5 lekcií zadarmo",
  ],
  pro: [
    "🤖 AI Asistent realitného makléra 24/7",
    "🧠 Predictive Deal Scoring – predikcia uzavretia",
    "📞 AI hovorová analýza – prepis + súhrn + next steps",
    "🎯 Intent Detection – AI rozozná pripravenosť kúpy",
    "⚡ Automatické opätovné kontakty – 7-dňové sekvencie",
    "🗺 Territory Intelligence – heat mapa aktivity",
    "📊 Revenue Forecasting – predikcia na 3 mesiace",
    "🔗 Integrácie: Nehnuteľnosti.sk, Reality.sk, TopReality.sk",
  ],
  enterprise: [
    "👑 Prehľad majiteľa – metriky celej kancelárie",
    "🧠 Team AI Brain – zdieľaná AI pamäť tímu",
    "⚡ Competitor Alert – sledovanie konkurencie",
    "🤖 Vlastná AI Persona – meno a štýl komunikácie",
    "🔗 API Prístup – integrácia s vlastnými systémami",
    "📄 White-label – vlastné logo na materiáloch",
    "☎ Dedikovaný Account Manager",
    "⚡ SLA garancia 99.9% uptime",
  ],
  free: [
    "🤖 AI Asistent – základný režim",
    "📊 Základné AI hodnotenie príležitostí",
    "📋 Obmedzený prehľad príležitostí",
  ],
} as const;

const PLAN_LABELS: Record<string, string> = {
  starter: "Štarter",
  pro: "Pro",
  enterprise: "Enterprise",
  free: "Free",
};

const PLAN_COLORS: Record<string, { bg: string; border: string; color: string }> = {
  starter: {
    bg: "rgba(34,211,238,0.08)",
    border: "rgba(34,211,238,0.20)",
    color: "#22D3EE",
  },
  pro: {
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.30)",
    color: "#818CF8",
  },
  enterprise: {
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.25)",
    color: "#FCD34D",
  },
  free: {
    bg: "rgba(100,116,139,0.10)",
    border: "rgba(100,116,139,0.20)",
    color: "#94A3B8",
  },
};

interface Props {
  plan?: string;
}

export const AIAssistBanner = memo(function AIAssistBanner({ plan = "free" }: Props) {
  const key = plan.toLowerCase() as keyof typeof PLAN_FEATURES;
  const features = PLAN_FEATURES[key] ?? PLAN_FEATURES.free;
  const label = PLAN_LABELS[key] ?? "Free";
  const colors = PLAN_COLORS[key] ?? PLAN_COLORS.free;

  return (
    <article className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/60 p-5 shadow-[0_0_26px_rgba(6,182,212,0.18)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/90">AI Assist Mode</p>
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            color: colors.color,
          }}
        >
          {label}
        </span>
      </div>

      <h2 className="mb-1 text-lg font-bold text-white">AI Asistent je aktívny</h2>
      <p className="mb-4 text-xs" style={{ color: "#64748B" }}>
        AI Asistent pracuje za teba - ty uzatváraš obchody.
      </p>

      <ul className="space-y-2">
        {features.map((feature) => {
          const firstSpace = feature.indexOf(" ");
          const emoji = firstSpace >= 0 ? feature.slice(0, firstSpace) : feature;
          const text = firstSpace >= 0 ? feature.slice(firstSpace + 1) : "";
          return (
            <li key={feature} className="flex items-start gap-2.5 text-xs">
              <span className="shrink-0 text-sm">{emoji}</span>
              <span style={{ color: "#94A3B8" }}>{text}</span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 border-t border-slate-800 pt-3 text-[10px]" style={{ color: "#334155" }}>
        Revolis.AI ťa nenahradí - pracuje pre teba.
      </p>
    </article>
  );
});
