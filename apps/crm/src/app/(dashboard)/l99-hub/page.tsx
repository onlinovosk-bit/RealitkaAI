"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Hammer, Zap } from "lucide-react";
import { NeuralPulse } from "@/components/visuals/NeuralPulse";
import { GhostBanner } from "@/components/l99/GhostBanner";
import { CadastreMapView } from "@/components/l99/CadastreMapView";
import { TIER_DISPLAY_NAMES, TIER_PRICES } from "@/types/intelligence-hub";
import type { HubTier, GhostSessionData } from "@/types/intelligence-hub";
import { canRenderModule, type ModuleKey } from "@/lib/modules/registry";

const TAB_TO_MODULE: Record<string, string> = {
  market: "stavba",
  radar: "bod-zlomu",
  ghost: "zmena-okolia",
};

const HUB_PREVIEW_MODULES: Array<{
  moduleKey: ModuleKey;
  id: string;
  title: string;
  icon: typeof Hammer;
  badge: string;
  badgeColor: string;
  text: string;
}> = [
  {
    moduleKey: "hub_planned_construction",
    id: "stavba",
    title: "Plánovaná stavba",
    icon: Hammer,
    badge: "Protocol Authority",
    badgeColor: "#60A5FA",
    text: "Stavebné povolenia a územné zmeny z verejných registrov — predikcia vývoja cien v zóne.",
  },
] as const;

function getGhostSession(): GhostSessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("l99_ghost_session");
    return raw ? (JSON.parse(raw) as GhostSessionData) : null;
  } catch {
    return null;
  }
}

export default function L99HubPage() {
  const searchParams = useSearchParams();
  const activeModuleId = TAB_TO_MODULE[searchParams?.get("tab") ?? ""] ?? null;

  const [tier, setTier] = useState<HubTier>("free");
  const [demoTierOverride, setDemoTierOverride] = useState<HubTier | null>(null);
  const [tierLoading, setTierLoading] = useState(true);
  const [ghostData, setGhostData] = useState<GhostSessionData | null>(null);

  useEffect(() => {
    fetch("/api/hub/get-tier")
      .then((r) => r.json())
      .then((d: { tier: HubTier }) => setTier(d.tier))
      .catch(() => setTier("free"))
      .finally(() => setTierLoading(false));

    setGhostData(getGhostSession());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const founderProgram = window.localStorage.getItem("founderDemoProgram");
    const map: Record<string, HubTier> = {
      free: "free",
      active_force: "pro",
      market_vision: "market_vision",
      protocol_authority: "protocol_authority",
    };
    if (founderProgram && map[founderProgram]) {
      setDemoTierOverride(map[founderProgram]);
    } else {
      setDemoTierOverride(null);
    }
  }, []);

  const effectiveTier = demoTierOverride ?? tier;
  const isEnterprise =
    effectiveTier === "enterprise" ||
    effectiveTier === "market_vision" ||
    effectiveTier === "protocol_authority";
  const isPro = effectiveTier === "pro" || isEnterprise;
  const visiblePreviewModules = HUB_PREVIEW_MODULES.filter((mod) =>
    canRenderModule(mod.moduleKey, effectiveTier),
  );
  const canShowBreakingPoint = canRenderModule("hub_breaking_point", effectiveTier);
  const canShowNeighborhoodChange = canRenderModule("hub_neighborhood_change", effectiveTier);
  const hasAnyLiveModule = canShowBreakingPoint || canShowNeighborhoodChange;

  return (
    <div className="min-h-screen bg-[#010103] text-slate-200 relative overflow-hidden">
      <NeuralPulse />

      {ghostData && (
        <GhostBanner
          data={ghostData}
          onDismiss={() => setGhostData(null)}
          onUnlock={() => {
            window.location.href = "/billing";
          }}
        />
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-12 py-12">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6 text-blue-400 font-bold italic text-[10px] uppercase tracking-widest">
            <Zap size={10} /> Revolis prediktívna inteligencia
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight uppercase italic">
            SKRYTÉ <span className="text-blue-500">PRÍLEŽITOSTI TRHU</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl uppercase tracking-wide">
            Verejné dáta a trhový radar — bez simulovaných signálov.
          </p>

          {!tierLoading && (
            <div className="mt-4 inline-flex items-center gap-2">
              <span className="text-xs text-slate-500">Tvoj plán:</span>
              <span
                className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                style={{
                  background: isEnterprise
                    ? "rgba(37,99,235,0.15)"
                    : isPro
                      ? "rgba(129,140,248,0.15)"
                      : "rgba(255,255,255,0.05)",
                  border: isEnterprise
                    ? "1px solid rgba(37,99,235,0.3)"
                    : isPro
                      ? "1px solid rgba(129,140,248,0.3)"
                      : "1px solid rgba(255,255,255,0.1)",
                  color: isEnterprise ? "#93C5FD" : isPro ? "#A5B4FC" : "#64748B",
                }}
              >
                {TIER_DISPLAY_NAMES[effectiveTier]}
                {TIER_PRICES[effectiveTier] ? ` · ${TIER_PRICES[effectiveTier]}€/mes` : ""}
              </span>
              {!isPro && (
                <a
                  href="/billing"
                  className="text-[10px] text-blue-400 hover:text-blue-300 underline uppercase tracking-wider"
                >
                  Upgradovať →
                </a>
              )}
            </div>
          )}
        </motion.header>

        {canShowBreakingPoint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <CadastreMapView
              title="Bod zlomu"
              subtitle="Display-only katastralna parcelna vrstva z verejneho INSPIRE WMS."
            />
          </motion.div>
        )}

        {canShowNeighborhoodChange && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-12"
          >
            <CadastreMapView
              title="Zmena v okoli"
              subtitle="Display-only parcelny overlay pre Protocol Authority bez signalovej vrstvy."
            />
          </motion.div>
        )}

        {visiblePreviewModules.length > 0 && (
          <>
            <p className="mb-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Moduly z verejných zdrojov (v príprave)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {visiblePreviewModules.map((mod, i) => {
                const Icon = mod.icon;
                return (
                  <motion.div
                    key={mod.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    className={`relative p-8 rounded-[2rem] border bg-[#0A0A12]/80 border-white/10 ${
                      mod.id === activeModuleId
                        ? "ring-2 ring-blue-400/60 ring-offset-2 ring-offset-[#010103]"
                        : ""
                    }`}
                  >
                    <div
                      className="absolute top-4 right-4 z-10 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider"
                      style={{
                        background: "rgba(148,163,184,0.12)",
                        color: "#94A3B8",
                        border: "1px solid rgba(148,163,184,0.25)",
                      }}
                    >
                      Čoskoro
                    </div>

                    <div className="mb-6 flex justify-between">
                      <Icon size={28} style={{ color: mod.badgeColor }} />
                    </div>

                    <span
                      className="mb-3 inline-block rounded-full px-2 py-0.5 text-[8px] font-bold uppercase"
                      style={{
                        background: `${mod.badgeColor}18`,
                        color: mod.badgeColor,
                        border: `1px solid ${mod.badgeColor}40`,
                      }}
                    >
                      {mod.badge}
                    </span>

                    <h3 className="text-lg font-black text-white mb-2 uppercase italic tracking-wide">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-slate-400 mb-6 leading-relaxed uppercase tracking-wider">
                      {mod.text}
                    </p>

                    <div
                      className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 text-center text-[10px] font-black uppercase tracking-widest text-slate-500"
                      aria-disabled="true"
                      role="status"
                    >
                      Čoskoro — napojenie na verejné registre
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        {!hasAnyLiveModule && !tierLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-8 rounded-2xl border border-white/10 bg-[#0A0A12]/80 p-6 text-sm text-slate-400"
          >
            V tomto pláne momentálne nie je dostupný žiadny live modul pre sekciu
            Skryté príležitosti trhu.
          </motion.div>
        )}
      </div>
    </div>
  );
}
