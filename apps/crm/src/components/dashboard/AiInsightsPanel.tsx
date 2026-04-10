"use client";
import { generateDailyInsights, getVisibleRecommendations, type Lead, type PlanTier } from "@/lib/ai-engine";
import PaywallLock from "@/components/shared/PaywallLock";
import Link from "next/link";

interface AiInsightsPanelProps {
  leads: Lead[];
  plan?: PlanTier;
}

const INSIGHT_STYLES = {
  warning:     { icon: "⚠️", color: "#FCA5A5", bg: "rgba(239,68,68,0.08)",    border: "rgba(239,68,68,0.20)" },
  opportunity: { icon: "🔥", color: "#FCD34D", bg: "rgba(245,158,11,0.08)",   border: "rgba(245,158,11,0.20)" },
  action:      { icon: "⚡", color: "#67E8F9", bg: "rgba(34,211,238,0.08)",   border: "rgba(34,211,238,0.20)" },
};

export default function AiInsightsPanel({
  leads,
  plan = "free",
}: AiInsightsPanelProps) {
  const allInsights = generateDailyInsights(leads);
  const { visible, locked, isLocked } = getVisibleRecommendations(
    allInsights,
    plan,
    2
  );

  if (allInsights.length === 0) {
    return (
      <div className="rounded-2xl border p-5 text-center"
           style={{ background: "#0A1628", borderColor: "#112240" }}>
        <p className="text-2xl mb-2">✅</p>
        <p className="text-sm text-slate-400">Všetko v poriadku. Žiadne urgentné akcie.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100">AI Insights</h3>
          <p className="text-xs text-slate-500">Denné odporúčania na základe tvojich dát</p>
        </div>
        {plan === "free" && (
          <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: "rgba(34,211,238,0.10)", color: "#22D3EE", border: "1px solid rgba(34,211,238,0.20)" }}>
            FREE
          </span>
        )}
      </div>

      {/* Viditeľné insights */}
      {visible.map((insight, i) => {
        const style = INSIGHT_STYLES[insight.type];
        return (
          <div
            key={i}
            className="rounded-xl border p-4"
            style={{ background: style.bg, borderColor: style.border }}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold mb-0.5"
                   style={{ color: style.color }}>
                  {insight.title}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {insight.description}
                </p>
                {insight.leadId && (
                  <Link
                    href={`/leads/${insight.leadId}`}
                    className="mt-2 inline-flex text-xs font-medium"
                    style={{ color: "#22D3EE" }}
                  >
                    Zobraziť lead →
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Paywall pre locked insights */}
      {isLocked && (
        <PaywallLock lockedCount={locked.length} feature="AI odporúčaní" />
      )}
    </div>
  );
}
