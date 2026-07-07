import type { OwnerTeamAnalytics, AnalyticsPeriod } from "@/lib/owner-team-analytics";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

interface Props {
  data: OwnerTeamAnalytics;
  teamQuery: { teamId?: string; period: AnalyticsPeriod; target?: number };
}

function displayCount(value: number): string {
  return value > 0 ? String(value) : "—";
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
      data-testid="team-pressure-panel"
    >
      <p
        className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: SLATE_HORIZON.brandDeep }}
      >
        Výkon tímu
      </p>
      <h2 className="mb-4 text-lg font-bold" style={{ color: SLATE_HORIZON.ink }}>
        Team Pressure — leady podľa makléra
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border p-4" style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.bg }}>
          <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>Leady celkom</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>{data.totalLeads}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.bg }}>
          <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>Priradené (FK)</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>{data.assignedLeads}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.bg }}>
          <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>Nepriradené</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>
            {displayCount(data.unassignedLeads)}
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.bg }}>
          <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>Ponuka / všetky</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>{data.conversionRate}%</p>
        </div>
      </div>

      {data.agentStats.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <p className="mb-2 text-xs font-semibold" style={{ color: SLATE_HORIZON.muted }}>
            Makléri ({data.agentStats.length})
          </p>
          <table className="min-w-full text-left text-sm" data-testid="team-pressure-table">
            <thead>
              <tr className="border-b" style={{ borderColor: SLATE_HORIZON.line, color: SLATE_HORIZON.muted }}>
                <th className="px-3 py-2 font-semibold">Maklér</th>
                <th className="px-3 py-2 font-semibold text-right">Leady</th>
                <th className="px-3 py-2 font-semibold text-right">Nový</th>
                <th className="px-3 py-2 font-semibold text-right">Ponuka</th>
              </tr>
            </thead>
            <tbody>
              {data.agentStats.map((agent) => (
                <tr
                  key={agent.profileId}
                  className="border-b last:border-b-0"
                  style={{ borderColor: SLATE_HORIZON.line }}
                  data-profile-id={agent.profileId}
                >
                  <td className="px-3 py-2 font-medium" style={{ color: SLATE_HORIZON.ink }}>
                    {agent.name}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums" style={{ color: SLATE_HORIZON.ink }}>
                    {displayCount(agent.leadsCount)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums" style={{ color: SLATE_HORIZON.ink }}>
                    {displayCount(agent.newLeadsCount)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums" style={{ color: SLATE_HORIZON.ink }}>
                    {displayCount(agent.closedCount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
