"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Mic2, Map, AlertTriangle, Hammer, Globe, Users, Zap } from "lucide-react";
import { NeuralPulse } from "@/components/visuals/NeuralPulse";
import { GhostBanner } from "@/components/L99/GhostBanner";
import { CompetitionMap } from "@/components/L99/CompetitionMap";
import type { HubTier } from "@/types/intelligence-hub";

// ─── Tier labels & colors ─────────────────────────────────────────────────
const TIER_LABELS: Record<HubTier, string> = {
  free:       "Smart Start",
  starter:    "Smart Start",
  pro:        "Market Vision",
  enterprise: "Protocol Authority",
};

const TIER_PRICE: Record<HubTier, string | null> = {
  free:       null,
  starter:    null,
  pro:        "199€ / mes",
  enterprise: "449€ / mes",
};

// ─── Moduly ───────────────────────────────────────────────────────────────
const MODULES = [
  {
    id: "skener",
    title: "Emocionálny skener",
    icon: Mic2,
    requiredTier: "pro" as HubTier,
    badge: "Market Vision",
    badgeColor: "#818CF8",
    text: "AI spozná čo sa klientovi páči počas obhliadky a povie ti, na čo máš zatlačiť.",
    btn: "Aktivovať skener",
  },
  {
    id: "bod-zlomu",
    title: "Bod Zlomu",
    icon: Map,
    requiredTier: "pro" as HubTier,
    badge: "Market Vision",
    badgeColor: "#818CF8",
    text: "Mapa ulíc, kde sa o chvíľu začne sťahovanie. Budeš tam prvý.",
    btn: "Zobraziť mapu",
  },
  {
    id: "financie",
    title: "Finančné problémy",
    icon: AlertTriangle,
    requiredTier: "enterprise" as HubTier,
    badge: "Protocol Authority",
    badgeColor: "#60A5FA",
    text: "AI sleduje exekúcie a dlhy. Vieš kto potrebuje rýchly predaj.",
    btn: "Odomknúť radar",
  },
  {
    id: "stavba",
    title: "Plánovaná stavba",
    icon: Hammer,
    requiredTier: "enterprise" as HubTier,
    badge: "Protocol Authority",
    badgeColor: "#60A5FA",
    text: "Sleduje stavebné povolenia. Budúci predajca bytu práve stavia dom.",
    btn: "Sledovať úrady",
  },
  {
    id: "zmena-okolia",
    title: "Zmena v okolí",
    icon: Globe,
    requiredTier: "enterprise" as HubTier,
    badge: "Protocol Authority",
    badgeColor: "#60A5FA",
    text: "Nová škola, park, diaľnica — AI predpovedá kde porastú ceny.",
    btn: "Aktivovať predikciu",
  },
  {
    id: "komunita",
    title: "Nálada v komunite",
    icon: Users,
    requiredTier: "enterprise" as HubTier,
    badge: "Protocol Authority",
    badgeColor: "#60A5FA",
    text: "Sleduje Facebook skupiny a diskusie. Vieš čo ľudia plánujú predať.",
    btn: "Monitorovať komunitu",
  },
];

function tierLevel(t: HubTier): number {
  return { free: 0, starter: 0, pro: 1, enterprise: 2 }[t];
}

function isUnlocked(required: HubTier, current: HubTier): boolean {
  return tierLevel(current) >= tierLevel(required);
}

// ─── Ghost session (localStorage) ────────────────────────────────────────
function getGhostSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("l99_ghost_session");
    return raw ? (JSON.parse(raw) as { mesto: string; stvrt: string; pocet: number }) : null;
  } catch {
    return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function L99HubPage() {
  const [tier, setTier]               = useState<HubTier>("free");
  const [tierLoading, setTierLoading] = useState(true);
  const [ghostData, setGhostData]     = useState<{ mesto: string; stvrt: string; pocet: number } | null>(null);

  useEffect(() => {
    // Načítaj skutočný tier zo servera
    fetch("/api/hub/get-tier")
      .then((r) => r.json())
      .then((d: { tier: HubTier }) => setTier(d.tier))
      .catch(() => setTier("free"))
      .finally(() => setTierLoading(false));

    // Ghost Resurrection – ak má user predchádzajúcu session
    setGhostData(getGhostSession());
  }, []);

  const isEnterprise = tier === "enterprise";
  const isPro        = tier === "pro" || isEnterprise;

  return (
    <div className="min-h-screen bg-[#010103] text-slate-200 relative overflow-hidden">

      {/* Neural Pulse pozadie */}
      <NeuralPulse />

      {/* Ghost Resurrection Banner */}
      {ghostData && (
        <GhostBanner
          data={ghostData}
          onUnlock={() => {
            if (!isPro) window.location.href = "/billing";
          }}
        />
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-12 py-12">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6 text-blue-400 font-bold italic text-[10px] uppercase tracking-widest">
            <Zap size={10} /> Revolis L99 Protocol Active
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight uppercase italic">
            L99 <span className="text-blue-500">HUB</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Prediktívna inteligencia. Dáta ktoré konkurencia nemá.
          </p>

          {/* Tier badge */}
          {!tierLoading && (
            <div className="mt-4 inline-flex items-center gap-2">
              <span className="text-xs text-slate-500">Tvoj plán:</span>
              <span
                className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                style={{
                  background: isEnterprise ? "rgba(37,99,235,0.15)" : isPro ? "rgba(129,140,248,0.15)" : "rgba(255,255,255,0.05)",
                  border: isEnterprise ? "1px solid rgba(37,99,235,0.3)" : isPro ? "1px solid rgba(129,140,248,0.3)" : "1px solid rgba(255,255,255,0.1)",
                  color: isEnterprise ? "#93C5FD" : isPro ? "#A5B4FC" : "#64748B",
                }}
              >
                {TIER_LABELS[tier]}
                {TIER_PRICE[tier] && ` · ${TIER_PRICE[tier]}`}
              </span>
              {!isPro && (
                <a href="/billing" className="text-[10px] text-blue-400 hover:text-blue-300 underline uppercase tracking-wider">
                  Upgradovať →
                </a>
              )}
            </div>
          )}
        </motion.header>

        {/* Competition Map – len pre Protocol Authority */}
        {isEnterprise && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <CompetitionMap />
          </motion.div>
        )}

        {/* Moduly grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {MODULES.map((mod, i) => {
            const unlocked = isUnlocked(mod.requiredTier, tier);
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className={`group relative p-8 rounded-[2rem] border transition-all duration-500 ${
                  unlocked
                    ? "bg-[#0A0A12] border-blue-500/30 shadow-[0_0_30px_-10px_rgba(37,99,235,0.2)] hover:border-blue-500/50"
                    : "bg-[#050508] border-white/5 opacity-40 cursor-not-allowed"
                }`}
              >
                {/* Tier badge */}
                {!unlocked && (
                  <div
                    className="absolute top-4 right-4 text-[9px] font-bold px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-pulse z-10"
                    style={{
                      background: `${mod.badgeColor}18`,
                      color: mod.badgeColor,
                      border: `1px solid ${mod.badgeColor}40`,
                    }}
                  >
                    {mod.badge}
                  </div>
                )}

                <div className="flex justify-between mb-6">
                  <Icon size={28} style={{ color: unlocked ? mod.badgeColor : "#334155" }} />
                  {!unlocked && <Lock size={14} style={{ color: "#334155" }} />}
                </div>

                <h3 className="text-lg font-black text-white mb-2 uppercase italic">
                  {mod.title}
                </h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  {mod.text}
                </p>

                <button
                  onClick={() => { if (!unlocked) window.location.href = "/billing"; }}
                  className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    unlocked
                      ? "text-white hover:scale-105"
                      : "bg-white/5 text-slate-600"
                  }`}
                  style={unlocked ? {
                    background: `linear-gradient(135deg, ${mod.badgeColor}40, ${mod.badgeColor}20)`,
                    border: `1px solid ${mod.badgeColor}40`,
                  } : undefined}
                >
                  {unlocked ? mod.btn : `Dostupné v ${mod.badge}`}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Upgrade CTA – len pre non-enterprise */}
        {!isEnterprise && !tierLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 p-10 rounded-[3rem] text-center"
            style={{
              background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(99,102,241,0.08) 100%)",
              border: "1px solid rgba(37,99,235,0.20)",
            }}
          >
            <h3 className="text-2xl font-black text-white mb-3 uppercase italic">
              {isPro ? "Aktivuj Protocol Authority" : "Začni s Market Vision"}
            </h3>
            <p className="text-sm text-slate-400 mb-6 max-w-lg mx-auto">
              {isPro
                ? "Odomkni Competition Map, Finančný radar, Plánované stavby a Náladu v komunite."
                : "Prvý krok k prediktívnej inteligencii. Od 199€/mes."
              }
            </p>
            <a
              href="/billing"
              className="inline-block px-10 py-4 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-blue-600/20"
            >
              {isPro ? "Upgradovať na Protocol Authority →" : "Aktivovať Market Vision →"}
            </a>
          </motion.div>
        )}

      </div>
    </div>
  );
}
