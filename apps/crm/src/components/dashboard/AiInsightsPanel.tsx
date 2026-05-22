"use client";

import { generateDailyInsights, getVisibleRecommendations, type Lead, type PlanTier } from "@/lib/ai-engine";
import PaywallLock from "@/components/shared/PaywallLock";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Flame, Zap } from "lucide-react";
import { SLATE_HORIZON, SLATE_HORIZON_BADGES, WORKDESK_INNER_ROW, WORKDESK_PANEL } from "@/lib/slate-horizon-theme";

interface AiInsightsPanelProps {
  leads: Lead[];
  plan?: PlanTier;
}

const INSIGHT_STYLES = {
  warning: {
    Icon: AlertTriangle,
    color: SLATE_HORIZON.danger,
    bg: "#FEF2F2",
    border: "#FECACA",
  },
  opportunity: {
    Icon: Flame,
    color: "#C2410C",
    bg: "#FFF7ED",
    border: "#FED7AA",
  },
  action: {
    Icon: Zap,
    color: SLATE_HORIZON.brandDeep,
    bg: SLATE_HORIZON.soft,
    border: "#BFDBFE",
  },
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
      <div
        className="rounded-[20px] border p-5 text-center"
        style={{
          background: WORKDESK_PANEL.background,
          borderColor: WORKDESK_PANEL.borderColor,
          boxShadow: WORKDESK_PANEL.boxShadow,
        }}
      >
        <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
          Všetko v poriadku. Žiadne urgentné akcie.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[20px] border p-4 md:p-5"
      style={{
        background: WORKDESK_PANEL.background,
        borderColor: WORKDESK_PANEL.borderColor,
        boxShadow: WORKDESK_PANEL.boxShadow,
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span
            className="mb-2 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: SLATE_HORIZON_BADGES.new.bg,
              color: SLATE_HORIZON_BADGES.new.color,
              border: `1px solid ${SLATE_HORIZON_BADGES.new.border}`,
            }}
          >
            AI Operating Signal
          </span>
          <h3 className="text-base font-semibold" style={{ color: SLATE_HORIZON.ink }}>
            Kde unikajú peniaze · Čo urobiť teraz
          </h3>
          <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
            Denné odporúčania s dopadom na províziu a follow-up
          </p>
        </div>
        {plan === "free" && (
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: SLATE_HORIZON.soft,
              color: SLATE_HORIZON.brandDeep,
              border: `1px solid ${SLATE_HORIZON.softBorder}`,
            }}
          >
            FREE
          </span>
        )}
      </div>

      <div className="space-y-3">
        {visible.map((insight, i) => {
          const style = INSIGHT_STYLES[insight.type];
          const Icon = style.Icon;
          const isStaleWarning =
            insight.type === "warning" &&
            insight.description.includes("5+ dní");
          return (
            <div
              key={i}
              className={`rounded-xl border p-4 ${isStaleWarning ? "cursor-pointer transition hover:border-blue-200" : ""}`}
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
                <Icon className="mt-0.5 shrink-0" size={18} style={{ color: style.color }} />
                <div className="min-w-0 flex-1">
                  <p className="mb-0.5 text-sm font-semibold" style={{ color: style.color }}>
                    {insight.title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
                    {insight.description}
                  </p>
                  {insight.leadId && (
                    <Link
                      href={`/leads/${insight.leadId}`}
                      className="mt-2 inline-flex text-xs font-medium"
                      style={{ color: SLATE_HORIZON.brandDeep }}
                    >
                      Zobraziť príležitosť →
                    </Link>
                  )}
                  {isStaleWarning && (
                    <p className="mt-2 text-[11px] font-medium" style={{ color: SLATE_HORIZON.brandDeep }}>
                      {expandedWarning ? "Skryť zoznam príležitostí ↑" : "Klikni a zobraz 3 príležitosti ↓"}
                    </p>
                  )}
                </div>
              </div>
              {isStaleWarning && expandedWarning && (
                <div
                  className="mt-3 rounded-lg border p-3"
                  style={{
                    borderColor: WORKDESK_INNER_ROW.borderColor,
                    background: WORKDESK_INNER_ROW.background,
                  }}
                >
                  <p className="mb-2 text-xs font-semibold" style={{ color: SLATE_HORIZON.ink }}>
                    Prvé príležitosti na okamžitý kontakt:
                  </p>
                  <div className="space-y-2">
                    {staleVisible.map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/leads/${lead.id}`}
                        className="block rounded-md border px-2 py-1.5 text-xs transition-colors hover:border-blue-200"
                        style={{
                          borderColor: WORKDESK_INNER_ROW.borderColor,
                          color: SLATE_HORIZON.deep,
                        }}
                      >
                        {lead.name} • {lead.status}
                      </Link>
                    ))}
                  </div>
                  {isFreePlan && staleLockedCount > 0 && (
                    <div
                      className="mt-3 rounded-md border p-2 text-xs"
                      style={{
                        background: SLATE_HORIZON.soft,
                        borderColor: SLATE_HORIZON.softBorder,
                        color: SLATE_HORIZON.brandDeep,
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

        {isLocked && (
          <PaywallLock
            lockedCount={locked.length}
            feature="príležitostí"
            titleOverride="+6 ďalších príležitostí"
            ctaLabel="Odomknúť Market Vision od 199 € mesačne"
          />
        )}
      </div>
    </div>
  );
}
