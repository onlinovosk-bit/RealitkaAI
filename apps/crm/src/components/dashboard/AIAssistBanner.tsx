"use client";
import { memo } from "react";
import { FEATURES as FEATURE_MATRIX } from "@/components/billing/FeatureComparisonTable";

type BannerPlan = "smartStart" | "activeForce" | "marketVision" | "protocolAuthority";

const PLAN_FEATURES: Record<BannerPlan, string[]> = {
  smartStart: FEATURE_MATRIX.filter((f) => f.smartStart === true).map((f) => f.feature),
  activeForce: FEATURE_MATRIX.filter((f) => f.activeForce === true).map((f) => f.feature),
  marketVision: FEATURE_MATRIX.filter((f) => f.marketVision === true).map((f) => f.feature),
  protocolAuthority: FEATURE_MATRIX.filter((f) => f.protocolAuthority === true).map((f) => f.feature),
};

const PLAN_LABELS: Record<BannerPlan, string> = {
  smartStart: "Smart Start",
  activeForce: "Active Force",
  marketVision: "Market Vision",
  protocolAuthority: "Protocol Authority",
};

const PLAN_COLORS: Record<BannerPlan, { bg: string; border: string; color: string }> = {
  smartStart: {
    bg: "rgba(34,211,238,0.08)",
    border: "rgba(34,211,238,0.20)",
    color: "#22D3EE",
  },
  activeForce: {
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.30)",
    color: "#818CF8",
  },
  marketVision: {
    bg: "rgba(16,185,129,0.10)",
    border: "rgba(16,185,129,0.22)",
    color: "#34D399",
  },
  protocolAuthority: {
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.25)",
    color: "#FCD34D",
  },
};

interface Props {
  plan?: string;
}

function resolveBannerPlan(plan: string | undefined): BannerPlan {
  const normalized = (plan ?? "").toLowerCase();
  if (normalized === "protocol_authority" || normalized === "protocol" || normalized === "enterprise") {
    return "protocolAuthority";
  }
  if (normalized === "market_vision" || normalized === "market") {
    return "marketVision";
  }
  if (normalized === "active_force" || normalized === "active" || normalized === "pro") {
    return "activeForce";
  }
  return "smartStart";
}

export const AIAssistBanner = memo(function AIAssistBanner({ plan = "free" }: Props) {
  const resolvedPlan = resolveBannerPlan(plan);
  const features = PLAN_FEATURES[resolvedPlan];
  const label = PLAN_LABELS[resolvedPlan];
  const colors = PLAN_COLORS[resolvedPlan];

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
          return (
            <li key={feature} className="flex items-start gap-2.5 text-xs">
              <span className="shrink-0 text-sm" style={{ color: colors.color }}>✓</span>
              <span style={{ color: "#94A3B8" }}>{feature}</span>
            </li>
          );
        })}
      </ul>

    </article>
  );
});
