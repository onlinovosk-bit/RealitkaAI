"use client";

import { useState } from "react";
import { Calculator, Zap, TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";
import L99LiveFeed from "./L99LiveFeed";
import IntelligenceHub from "./IntelligenceHub";

const AcquisitionHub = dynamic(() => import("./AcquisitionHub"), { ssr: false });

// ─── ROI Calculator ───────────────────────────────────────────────────────
function RoiCalculator() {
  const [mandats, setMandats] = useState(4);
  const [avgCommission, setAvgCommission] = useState(3200);
  const [plan, setPlan] = useState<"starter" | "pro" | "enterprise">("pro");

  const planCosts: Record<typeof plan, number> = {
    starter:    99,
    pro:       199,
    enterprise: 449,
  };
  const planMultipliers: Record<typeof plan, number> = {
    starter:   1.3,
    pro:       1.7,
    enterprise: 2.4,
  };

  const monthlyCost  = planCosts[plan];
  const extraMandats = mandats * (planMultipliers[plan] - 1);
  const extraRevenue = extraMandats * avgCommission;
  const roi          = monthlyCost > 0 ? ((extraRevenue - monthlyCost) / monthlyCost) * 100 : 0;

  const fmt = (n: number) =>
    new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  return (
    <div
      className="rounded-3xl p-8 max-w-2xl mx-auto"
      style={{ background: "#0A0A12", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <h3 className="text-xl font-black text-white uppercase italic mb-6">
        ROI <span style={{ color: "#60A5FA" }}>Kalkulačka</span>
      </h3>

      <div className="space-y-6 mb-8">
        {/* Mandáty / mesiac */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Mandáty / mesiac (teraz): <span className="text-white">{mandats}</span>
          </label>
          <input
            type="range" min={1} max={20} value={mandats}
            onChange={(e) => setMandats(+e.target.value)}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Priemerná provízia */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Priemerná provízia: <span className="text-white">{fmt(avgCommission)}</span>
          </label>
          <input
            type="range" min={500} max={10000} step={100} value={avgCommission}
            onChange={(e) => setAvgCommission(+e.target.value)}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Plán */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Revolis.AI plán
          </label>
          <div className="flex gap-2">
            {(["starter", "pro", "enterprise"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlan(p)}
                className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                style={{
                  background: plan === p ? "rgba(37,99,235,0.25)" : "rgba(255,255,255,0.04)",
                  border: plan === p ? "1px solid rgba(37,99,235,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  color: plan === p ? "#93C5FD" : "#475569",
                }}
              >
                {p === "starter" ? "Smart Start" : p === "pro" ? "Active Force" : "Market Vision"}
                <br />
                <span className="text-[9px]">{planCosts[p]}€/mes</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Výsledok */}
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)" }}
      >
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-2xl font-black text-white">{extraMandats.toFixed(1)}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Extra mandáty</div>
          </div>
          <div>
            <div className="text-2xl font-black" style={{ color: "#34D399" }}>{fmt(extraRevenue)}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Extra príjem</div>
          </div>
          <div>
            <div className="text-2xl font-black" style={{ color: "#FBBF24" }}>{roi.toFixed(0)}%</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">ROI</div>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Náklady {fmt(monthlyCost)}/mes · Čistý zisk {fmt(extraRevenue - monthlyCost)}/mes
        </p>
      </div>

      <div className="mt-6 text-center">
        <a
          href="/billing"
          className="inline-block px-8 py-3.5 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-blue-600/20"
        >
          Začať zarábať viac →
        </a>
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "odhadca",  label: "AI Odhadca",       icon: Calculator },
  { id: "l99",      label: "L99 Prehľad trhu", icon: Zap },
  { id: "roi",      label: "ROI Kalkulačka",   icon: TrendingUp },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── UnifiedDemo ──────────────────────────────────────────────────────────
export default function UnifiedDemo() {
  const [active, setActive] = useState<TabId>("odhadca");

  return (
    <div className="min-h-screen bg-[#010103] text-slate-200">
      {/* Tab bar */}
      <div
        className="sticky top-0 z-30 flex justify-center gap-2 px-4 py-3"
        style={{ background: "rgba(1,1,3,0.92)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all"
            style={{
              background: active === id ? "rgba(37,99,235,0.25)" : "rgba(255,255,255,0.04)",
              border: active === id ? "1px solid rgba(37,99,235,0.5)" : "1px solid rgba(255,255,255,0.08)",
              color: active === id ? "#93C5FD" : "#475569",
            }}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {active === "odhadca" && <AcquisitionHub />}

        {active === "l99" && (
          <div className="space-y-6">
            <L99LiveFeed />
            <IntelligenceHub />
          </div>
        )}

        {active === "roi" && <RoiCalculator />}
      </div>
    </div>
  );
}
