"use client";
import { memo } from "react";
import { FEATURES as FEATURE_MATRIX } from "@/components/billing/FeatureComparisonTable";
import { AI_ASSISTANT_NAME, AI_ASSISTANT_STATUS_ACTIVE } from "@/lib/ai-brand";

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

const PLAN_BADGE: Record<BannerPlan, string> = {
  smartStart: "border-cyan-200 bg-cyan-50 text-cyan-800",
  activeForce: "border-blue-200 bg-blue-50 text-blue-800",
  marketVision: "border-emerald-200 bg-emerald-50 text-emerald-800",
  protocolAuthority: "border-amber-200 bg-amber-50 text-amber-900",
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
  const badgeClass = PLAN_BADGE[resolvedPlan];

  return (
    <article className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700">
          {AI_ASSISTANT_NAME} · plán
        </p>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}
        >
          {label}
        </span>
      </div>

      <h2 className="mb-1 text-lg font-extrabold tracking-tight text-slate-950">
        {AI_ASSISTANT_STATUS_ACTIVE}
      </h2>
      <p className="mb-4 text-xs leading-5 text-slate-600">
        {AI_ASSISTANT_NAME} radí pri telefonátoch a obchodoch — ty uzatváraš a inkasuješ províziu.
      </p>

      <ul className="space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-xs text-slate-700">
            <span className="mt-0.5 shrink-0 font-bold text-emerald-600" aria-hidden>
              ✓
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  );
});
