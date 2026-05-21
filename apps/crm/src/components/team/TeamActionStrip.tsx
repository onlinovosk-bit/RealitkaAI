"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import {
  buildTeamAgentSignals,
  buildTeamRiskHeadline,
  type TeamAgentSignal,
} from "@/lib/workdesk/team-signals";
import { trackWorkdeskEvent } from "@/lib/workdesk/ai-telemetry";
import type { Lead } from "@/lib/leads-store";
import { SLATE_HORIZON, SLATE_HORIZON_BADGES, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

type Props = {
  leads: Lead[];
  profiles: Array<{ id: string; fullName: string }>;
  monthlyTargetPerAgent?: number;
};

const DEMO_SIGNALS: TeamAgentSignal[] = [
  {
    agentKey: "demo-a1",
    agentName: "Miroslav Horváth",
    action: "Horúce leady chladnú — presuň na call blok dnes",
    riskEur: 18400,
    staleLeads: 4,
    hotLeads: 3,
    leadsCount: 11,
    urgency: "critical",
  },
  {
    agentKey: "demo-a2",
    agentName: "Katka Nováková",
    action: "Pod cieľom príležitostí — aktivuj akvizíciu a radar",
    riskEur: 9200,
    staleLeads: 2,
    hotLeads: 1,
    leadsCount: 8,
    urgency: "high",
  },
];

function urgencyBadge(urgency: TeamAgentSignal["urgency"]) {
  if (urgency === "critical") return SLATE_HORIZON_BADGES.hot;
  if (urgency === "high") return SLATE_HORIZON_BADGES.team;
  return SLATE_HORIZON_BADGES.new;
}

/** Team screen NBA — „Ktorý maklér práve stráca peniaze?" */
export function TeamActionStrip({ leads, profiles, monthlyTargetPerAgent = 15 }: Props) {
  const signals = buildTeamAgentSignals(leads, profiles, monthlyTargetPerAgent);
  const items = signals.length > 0 ? signals : DEMO_SIGNALS;
  const placeholders = signals.length === 0;
  const { headline, subline } = buildTeamRiskHeadline(items);

  return (
    <section
      className="mb-6 overflow-hidden rounded-2xl border"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: items.some((s) => s.urgency === "critical") ? "#FECACA" : WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <div
        className="flex items-start gap-3 border-b px-4 py-4 md:px-5"
        style={{
          borderColor: SLATE_HORIZON.line,
          background: items.some((s) => s.urgency === "critical") ? "#FEF2F2" : SLATE_HORIZON.soft,
        }}
      >
        <Users size={20} className="mt-0.5 shrink-0" style={{ color: SLATE_HORIZON.brandDeep }} />
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide" style={{ color: SLATE_HORIZON.brandDeep }}>
            Ktorý maklér práve stráca peniaze?
          </h2>
          <p className="mt-1 text-base font-bold" style={{ color: SLATE_HORIZON.ink }}>
            {headline}
          </p>
          <p className="mt-0.5 text-sm" style={{ color: SLATE_HORIZON.muted }}>
            {subline}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-3">
        {items.map((signal) => {
          const badge = urgencyBadge(signal.urgency);
          return (
            <Link
              key={signal.agentKey}
              href={placeholders ? "/team" : `/team/analytics?agent=${encodeURIComponent(signal.agentName)}`}
              onClick={() =>
                trackWorkdeskEvent("team_alert_click", {
                  agentKey: signal.agentKey,
                  riskEur: signal.riskEur,
                  urgency: signal.urgency,
                })
              }
              className="rounded-xl border p-3 transition-all hover:shadow-sm"
              style={{ borderColor: SLATE_HORIZON.line }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold" style={{ color: SLATE_HORIZON.ink }}>
                  {signal.agentName}
                </span>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                >
                  {signal.urgency}
                </span>
              </div>
              <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
                {signal.action}
              </p>
              <p className="mt-2 text-[11px]" style={{ color: SLATE_HORIZON.navText }}>
                {signal.leadsCount} leadov · {signal.hotLeads} horúcich · €{signal.riskEur.toLocaleString("sk-SK")} riziko
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
