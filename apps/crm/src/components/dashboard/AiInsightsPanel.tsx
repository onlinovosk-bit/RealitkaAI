"use client";
import { generateDailyInsights, getVisibleRecommendations, type Lead, type PlanTier } from "@/lib/ai-engine";
import PaywallLock from "@/components/shared/PaywallLock";
import Link from "next/link";
import { useState } from "react";

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
  const [expandedWarning, setExpandedWarning] = useState(false);
  const allInsights = generateDailyInsights(leads);
  const { visible, locked, isLocked } = getVisibleRecommendations(
    allInsights,
    plan,
    2
  );
  const staleLeads = leads
    .filter((lead) => {
      if (lead.status === "Uzatvorený") return false;
      if (!lead.last_contact_at) return true;
      const diff = Date.now() - new Date(lead.last_contact_at).getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return days >= 5;
    })
    .sort((a, b) => {
      const aTime = a.last_contact_at ? new Date(a.last_contact_at).getTime() : 0;
      const bTime = b.last_contact_at ? new Date(b.last_contact_at).getTime() : 0;
      return aTime - bTime;
    });
  const isFreePlan = plan === "free";
  const staleVisible = isFreePlan ? staleLeads.slice(0, 3) : staleLeads;
  const staleLockedCount = Math.max(staleLeads.length - staleVisible.length, 0);

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
          <h3 className="text-base font-bold text-slate-100">AI Odporúčania</h3>
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
        const isStaleWarning =
          insight.type === "warning" &&
          insight.description.includes("5+ dní");
        return (
          <div
            key={i}
            className={`rounded-xl border p-4 ${isStaleWarning ? "cursor-pointer transition hover:opacity-90" : ""}`}
            style={{ background: style.bg, borderColor: style.border }}
            onClick={() => {
              if (isStaleWarning) {
                setExpandedWarning((prev) => !prev);
              }
            }}
            role={isStaleWarning ? "button" : undefined}
            tabIndex={isStaleWarning ? 0 : undefined}
            onKeyDown={(event) => {
              if (!isStaleWarning) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setExpandedWarning((prev) => !prev);
              }
            }}
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
                    Zobraziť príležitosť →
                  </Link>
                )}
                {isStaleWarning && (
                  <p className="mt-2 text-[11px] font-medium" style={{ color: "#22D3EE" }}>
                    {expandedWarning ? "Skryť zoznam príležitostí ↑" : "Klikni a zobraz 3 príležitosti ↓"}
                  </p>
                )}
              </div>
            </div>
            {isStaleWarning && expandedWarning && (
              <div className="mt-3 rounded-lg border p-3" style={{ borderColor: "rgba(34,211,238,0.20)", background: "rgba(15,23,42,0.35)" }}>
                <p className="mb-2 text-xs font-semibold text-slate-200">
                  Prvé príležitosti na okamžitý kontakt:
                </p>
                <div className="space-y-2">
                  {staleVisible.map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      className="block rounded-md border px-2 py-1.5 text-xs text-slate-300 hover:text-cyan-300"
                      style={{ borderColor: "rgba(148,163,184,0.25)" }}
                    >
                      {lead.name} • {lead.status}
                    </Link>
                  ))}
                </div>
                {isFreePlan && staleLockedCount > 0 && (
                  <div
                    className="mt-3 rounded-md border p-2 text-xs"
                    style={{
                      background: "rgba(34,211,238,0.08)",
                      borderColor: "rgba(34,211,238,0.25)",
                      color: "#BAE6FD",
                    }}
                  >
                    <p>Ďalšie príležitosti odomkneš v programe Smart Start.</p>
                  </div>
                )}
              </div>
            )}
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
