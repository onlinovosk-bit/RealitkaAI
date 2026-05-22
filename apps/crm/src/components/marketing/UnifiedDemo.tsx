"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Calculator, TrendingUp, Zap, ArrowRight } from "lucide-react";
import L99LiveFeed from "./L99LiveFeed";
import IntelligenceHub from "./IntelligenceHub";
import AcquisitionHub from "./AcquisitionHub";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";
import { DEMO } from "@/lib/demo-slate-styles";
import { trackRevenueTelemetry } from "@/lib/analytics/revenue-telemetry";

// ─── ROI Calculator ───────────────────────────────────────────────────────
function RoiCalculator() {
  const [mandats, setMandats] = useState(4);
  const [avgCommission, setAvgCommission] = useState(3200);
  const [plan, setPlan] = useState<"starter" | "pro" | "enterprise">("pro");

  const planCosts: Record<typeof plan, number> = {
    starter: 99,
    pro: 199,
    enterprise: 449,
  };
  const planMultipliers: Record<typeof plan, number> = {
    starter: 1.3,
    pro: 1.7,
    enterprise: 2.4,
  };

  const monthlyCost = planCosts[plan];
  const extraMandats = mandats * (planMultipliers[plan] - 1);
  const extraRevenue = extraMandats * avgCommission;
  const roi = monthlyCost > 0 ? ((extraRevenue - monthlyCost) / monthlyCost) * 100 : 0;

  const fmt = (n: number) =>
    new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  return (
    <div
      className="mx-auto max-w-2xl rounded-3xl p-8"
      style={{
        background: WORKDESK_CARD.background,
        border: `1px solid ${WORKDESK_CARD.borderColor}`,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <h3 className="mb-6 text-xl font-black uppercase italic" style={{ color: SLATE_HORIZON.ink }}>
        ROI <span style={{ color: SLATE_HORIZON.brand }}>Kalkulačka</span>
      </h3>

      <div className="mb-8 space-y-6">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider" style={{ color: SLATE_HORIZON.muted }}>
            Mandáty / mesiac (teraz): <span style={{ color: SLATE_HORIZON.ink }}>{mandats}</span>
          </label>
          <input
            type="range"
            min={1}
            max={20}
            value={mandats}
            onChange={(e) => setMandats(+e.target.value)}
            className="w-full accent-blue-600"
            aria-label="Počet mandátov mesačne"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider" style={{ color: SLATE_HORIZON.muted }}>
            Priemerná provízia: <span style={{ color: SLATE_HORIZON.ink }}>{fmt(avgCommission)}</span>
          </label>
          <input
            type="range"
            min={500}
            max={10000}
            step={100}
            value={avgCommission}
            onChange={(e) => setAvgCommission(+e.target.value)}
            className="w-full accent-blue-600"
            aria-label="Priemerná provízia"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider" style={{ color: SLATE_HORIZON.muted }}>
            Revolis.AI plán
          </label>
          <div className="flex gap-2">
            {(["starter", "pro", "enterprise"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={`min-h-11 flex-1 rounded-xl py-2 text-[10px] font-black uppercase tracking-wider transition-all ${SLATE_HORIZON.focusRing}`}
                style={{
                  background: plan === p ? DEMO.brandTint : SLATE_HORIZON.bg,
                  border: plan === p ? `1px solid ${SLATE_HORIZON.softBorder}` : `1px solid ${SLATE_HORIZON.line}`,
                  color: plan === p ? SLATE_HORIZON.brandDeep : SLATE_HORIZON.muted,
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

      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: DEMO.brandTint, border: `1px solid ${SLATE_HORIZON.softBorder}` }}
      >
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-black" style={{ color: SLATE_HORIZON.ink }}>
              {extraMandats.toFixed(1)}
            </div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: SLATE_HORIZON.muted }}>
              Extra mandáty
            </div>
          </div>
          <div>
            <div className="text-2xl font-black" style={{ color: SLATE_HORIZON.greenDark }}>
              {fmt(extraRevenue)}
            </div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: SLATE_HORIZON.muted }}>
              Extra príjem
            </div>
          </div>
          <div>
            <div className="text-2xl font-black" style={{ color: SLATE_HORIZON.amber }}>
              {roi.toFixed(0)}%
            </div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: SLATE_HORIZON.muted }}>
              ROI
            </div>
          </div>
        </div>
        <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
          Náklady {fmt(monthlyCost)}/mes · Čistý zisk {fmt(extraRevenue - monthlyCost)}/mes
        </p>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/billing"
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] ${SLATE_HORIZON.focusRing}`}
          style={{ background: SLATE_HORIZON.ctaGradient, boxShadow: "0 8px 24px rgba(249,115,22,0.25)" }}
        >
          Začať zarábať viac
          <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "odhadca", label: "AI Odhadca", icon: Calculator },
  { id: "l99", label: "Radar príležitostí", icon: Zap },
  { id: "roi", label: "ROI Kalkulačka", icon: TrendingUp },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── UnifiedDemo ──────────────────────────────────────────────────────────
export default function UnifiedDemo() {
  const [active, setActive] = useState<TabId>("odhadca");
  const startedRef = useRef(false);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void trackRevenueTelemetry("demo_start", { entryTab: "odhadca", surface: "/demo" });
  }, []);

  useEffect(() => {
    const onLeave = () => {
      void trackRevenueTelemetry("demo_finish", {
        lastTab: activeRef.current,
        surface: "/demo",
      });
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, []);

  function selectTab(id: TabId) {
    if (id !== active) {
      void trackRevenueTelemetry("demo_finish", { lastTab: active, nextTab: id, surface: "/demo" });
    }
    setActive(id);
  }

  return (
    <div className="min-h-screen" style={{ background: SLATE_HORIZON.bg, color: SLATE_HORIZON.ink }}>
      {/* Hero strip */}
      <header
        className="relative overflow-hidden px-4 py-10 text-center md:px-8 md:py-12"
        style={{ background: SLATE_HORIZON.heroGradient }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: SLATE_HORIZON.heroAmbient }}
          aria-hidden
        />
        <p className="relative text-xs font-bold uppercase tracking-[0.3em] text-blue-200/90">Revolis.AI · Živé demo</p>
        <h1 className="relative mt-3 text-3xl font-black uppercase italic text-white md:text-4xl">
          AI moduly v praxi
        </h1>
        <p className="relative mx-auto mt-3 max-w-xl text-sm text-blue-100/80">
          Odhadca ceny, radar príležitostí a ROI kalkulačka — bez registrácie.
        </p>
      </header>

      {/* Tab bar */}
      <div
        className="sticky top-0 z-30 flex justify-center gap-2 border-b px-4 py-3 backdrop-blur-md"
        style={{
          background: "rgba(255,255,255,0.95)",
          borderColor: SLATE_HORIZON.line,
          boxShadow: "0 4px 20px rgba(15,23,42,0.04)",
        }}
        role="tablist"
        aria-label="Demo moduly"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectTab(id)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-5 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all ${SLATE_HORIZON.focusRing}`}
              style={{
                background: isActive ? DEMO.brandTint : SLATE_HORIZON.bg,
                border: isActive ? `1px solid ${SLATE_HORIZON.softBorder}` : `1px solid ${SLATE_HORIZON.line}`,
                color: isActive ? SLATE_HORIZON.brandDeep : SLATE_HORIZON.muted,
              }}
            >
              <Icon size={14} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
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
