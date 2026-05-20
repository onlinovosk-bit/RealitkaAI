import type { OwnerTeamAnalytics, AnalyticsPeriod } from "@/lib/owner-team-analytics";

interface Props {
  data: OwnerTeamAnalytics;
  teamQuery: { teamId?: string; period: AnalyticsPeriod; target?: number };
}

export default function TeamOwnerInsights({ data }: Props) {
  return (
    <section className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-950/5">
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700">
        Prehľad majiteľa kancelárie
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Príležitosti celkom</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{data.totalLeads}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs text-slate-500">Priradené</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{data.assignedLeads}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs text-slate-500">Konverzný pomer</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{data.conversionRate}%</p>
        </div>
      </div>

      {data.agentStats.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-slate-600">Výkon maklérov</p>
          <ul className="space-y-2">
            {data.agentStats.map((agent) => (
              <li key={agent.profileId} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-900">{agent.name}</span>
                <span className="text-xs text-slate-500">
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
