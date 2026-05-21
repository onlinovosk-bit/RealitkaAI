import type { OwnerTeamAnalytics, AnalyticsPeriod } from "@/lib/owner-team-analytics";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

interface Props {
  data: OwnerTeamAnalytics;
  teamQuery: { teamId?: string; period: AnalyticsPeriod; target?: number };
}

export default function TeamOwnerInsights({ data }: Props) {
  return (
    <section
      className="mb-6 rounded-2xl border p-5"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <p
        className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: SLATE_HORIZON.brandDeep }}
      >
        Prehľad majiteľa kancelárie
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4" style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.bg }}>
          <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>Príležitosti celkom</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>{data.totalLeads}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.bg }}>
          <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>Priradené</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>{data.assignedLeads}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.bg }}>
          <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>Konverzný pomer</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>{data.conversionRate}%</p>
        </div>
      </div>

      {data.agentStats.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold" style={{ color: SLATE_HORIZON.muted }}>
            Výkon maklérov
          </p>
          <ul className="space-y-2">
            {data.agentStats.map((agent) => (
              <li
                key={agent.profileId}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: SLATE_HORIZON.line, background: "#FFFFFF" }}
              >
                <span style={{ color: SLATE_HORIZON.ink }}>{agent.name}</span>
                <span className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
                  {agent.leadsCount} príležitostí · {agent.closedCount} uzatvorených
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
