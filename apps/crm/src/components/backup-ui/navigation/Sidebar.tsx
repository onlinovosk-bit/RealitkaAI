"use client";

import React from "react";
import Link from "next/link";
import { Crown, Lock, Zap } from "lucide-react";
import { REVOLIS_NAV_MATRIX, type Tier } from "@/lib/constants/navigation";

const FEATURE_PATHS: Record<string, string> = {
  ai_assistant_workhours: "/dashboard",
  daily_briefing: "/dashboard",
  hot_alert: "/dashboard",
  ambient_radar: "/l99-hub",
  ghost_bsm: "/bsm-reforma",
  kataster_pulse: "/leads",
  kataster_pulse_unlimited: "/l99-hub",
  xml_ingestor: "/import",
  radar_digest: "/dashboard",
  predictive_deal_scoring: "/scoring",
  intent_detection: "/call-analyzer",
  territory_intelligence: "/dashboard/revolis-ai",
  revenue_forecasting: "/forecasting",
  portal_integrations: "/integrations",
  neural_scoring: "/scoring",
  heatmaps: "/dashboard/revolis-ai",
  sleep_detector: "/l99-hub",
  ai_pricing: "/dashboard/revolis-ai",
  shadow_inv: "/api/l99/shadow-inventory",
  market_gap: "/api/reports/generate-developer-insights?city=Presov",
  buyer_readiness_index: "/dashboard",
  weekly_conversion_report: "/dashboard",
  revolis_academy: "/onboarding",
  ai_assistant_24_7: "/dashboard",
  ai_call_analysis: "/call-analyzer",
  auto_recontact: "/outreach",
  broker_profile: "/dashboard/reputation/profile",
  owner_overview: "/dashboard",
  team_ai_brain: "/team",
  competitor_alert: "/l99-hub",
  custom_ai_persona: "/settings/nexus-ai-chat",
  api_access: "/developer/docs",
  white_label: "/settings",
  dedicated_am: "/support",
  sla_uptime: "/sla",
  verified_cert: "/makleri/smolko-reality",
  ai_coaching: "/dashboard/reputation/coaching",
  digital_onboarding: "/onboarding",
  integrity_monitor: "/dashboard/reputation/integrity",
  performance: "/performance",
};

const TIER_WEIGHT: Record<Tier, number> = {
  STARTER: 0,
  ACTIVE_FORCE: 1,
  MARKET_VISION: 2,
  PROTOCOL_AUTHORITY: 3,
};

function checkAccess(currentTier: Tier, minTier: Tier) {
  return TIER_WEIGHT[currentTier] >= TIER_WEIGHT[minTier];
}

export default function Sidebar({ currentTier = "MARKET_VISION" }: { currentTier?: Tier }) {
  return (
    <aside className="flex h-screen w-72 flex-col border-r border-white/5 bg-[#050505] font-sans selection:bg-blue-500/30">
      <div className="p-8">
        <h1 className="text-2xl font-black italic tracking-tighter text-white">
          REVOLIS<span className="text-blue-500">.AI</span>
        </h1>
        <div className="mt-1 h-[2px] w-8 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
      </div>

      <nav className="flex-1 space-y-8 overflow-y-auto px-2">
        {Object.values(REVOLIS_NAV_MATRIX).map((section) => (
          <div key={section.label}>
            <div className="mb-3 px-6">
              <h3 className="text-[11px] font-black uppercase italic tracking-tighter text-white">{section.label}</h3>
              <p className="text-[7px] font-bold uppercase tracking-widest text-slate-500">{section.sub}</p>
            </div>

            <div className="space-y-0.5">
              {section.features.map((feature) => {
                const hasAccess = checkAccess(currentTier, feature.minTier);
                const isProtocol = feature.minTier === "PROTOCOL_AUTHORITY";
                const itemClass = `group flex items-center justify-between rounded-xl px-6 py-2.5 transition-all duration-300 ${
                  hasAccess ? "cursor-pointer hover:bg-white/5" : "cursor-not-allowed opacity-30 grayscale"
                }`;

                const content = (
                  <>
                    <div className="flex items-center gap-3">
                      <Zap
                        size={14}
                        className={
                          isProtocol && hasAccess
                            ? "text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]"
                            : "text-blue-500"
                        }
                      />
                      <span className={`text-[11px] font-bold tracking-tight ${isProtocol ? "text-yellow-100/80" : "text-slate-300"}`}>
                        {feature.name}
                      </span>
                    </div>

                    {!hasAccess ? (
                      <div className="flex items-center gap-1">
                        <Lock size={10} className="text-slate-600" />
                        <span className="text-[6px] font-black uppercase text-slate-500">Od {feature.minTier}</span>
                      </div>
                    ) : feature.isNew ? (
                      <div className="h-1.5 w-1.5 animate-ping rounded-full bg-blue-500" />
                    ) : null}
                  </>
                );

                if (!hasAccess) {
                  return (
                    <div key={feature.id} className={itemClass}>
                      {content}
                    </div>
                  );
                }

                return (
                  <Link key={feature.id} href={FEATURE_PATHS[feature.id] ?? "/dashboard"} className={itemClass}>
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto p-4">
        <div
          className={`rounded-[2rem] border p-4 transition-all ${
            currentTier === "PROTOCOL_AUTHORITY"
              ? "border-yellow-500/20 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.1)]"
              : "border-white/10 bg-white/[0.02]"
          }`}
        >
          <div className="mb-1 flex items-center gap-2">
            <Crown size={14} className={currentTier === "PROTOCOL_AUTHORITY" ? "text-yellow-500" : "text-blue-500"} />
            <span className="text-[9px] font-black uppercase italic tracking-widest text-white">
              {currentTier.replace("_", " ")}
            </span>
          </div>
          <p className="text-[7px] font-bold uppercase text-slate-500">System Authority Status: Active</p>
        </div>
      </div>
    </aside>
  );
}
