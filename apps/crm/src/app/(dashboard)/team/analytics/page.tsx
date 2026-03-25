import { getTeamPerformanceKpis, getAgentPerformanceMetrics } from "@/lib/team-store";

export default async function TeamAnalyticsPage() {
  const [teamKpis, agentMetrics] = await Promise.all([
    getTeamPerformanceKpis(),
    getAgentPerformanceMetrics(),
  ]);

  return (
    <main className="p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tímová Analytika</h1>
          <p className="mt-1 text-gray-500">
            Výkon tímov a agentov na základe metrik.
          </p>
        </div>

        {/* Teams Performance */}
        <section className="mb-6">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Výkon Tímov</h2>
              <p className="text-sm text-gray-500">KPI metriky podľa tímov</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Tím</th>
                    <th className="px-5 py-3 font-medium">Členovia</th>
                    <th className="px-5 py-3 font-medium">Leady</th>
                    <th className="px-5 py-3 font-medium">Horúci</th>
                    <th className="px-5 py-3 font-medium">Konverzia</th>
                    <th className="px-5 py-3 font-medium">Priem. Score</th>
                    <th className="px-5 py-3 font-medium">Matchingy</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {teamKpis.map((kpi) => (
                    <tr key={kpi.teamId} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-medium text-gray-900">{kpi.teamName}</td>
                      <td className="px-5 py-4 text-gray-700">{kpi.memberCount}</td>
                      <td className="px-5 py-4 text-gray-700">{kpi.totalLeads}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                          {kpi.hotLeads}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-12 rounded-full bg-gray-200">
                            <div 
                              className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${Math.min(kpi.conversionRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{kpi.conversionRate}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                          {kpi.avgScore}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-700">{kpi.matchingsSent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {teamKpis.length === 0 && (
              <div className="rounded-lg bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-500">Zatiaľ nie sú žiadne tímy</p>
              </div>
            )}
          </div>
        </section>

        {/* Agents Performance */}
        <section>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Výkon Agentov</h2>
              <p className="text-sm text-gray-500">Individuálne metriky agentov</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Meno</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Rola</th>
                    <th className="px-5 py-3 font-medium">Leady</th>
                    <th className="px-5 py-3 font-medium">Horúci</th>
                    <th className="px-5 py-3 font-medium">Konverzia</th>
                    <th className="px-5 py-3 font-medium">Priem. Score</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {agentMetrics.map((agent) => (
                    <tr key={agent.profileId} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-medium text-gray-900">{agent.fullName}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{agent.email || "-"}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                          {agent.role === "agent" ? "Agent" : "Manažér"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-700">{agent.totalLeads}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                          {agent.hotLeads}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-12 rounded-full bg-gray-200">
                            <div 
                              className="h-2 rounded-full bg-emerald-500"
                              style={{ width: `${Math.min(agent.conversionRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{agent.conversionRate}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                          {agent.avgScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {agentMetrics.length === 0 && (
              <div className="rounded-lg bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-500">Zatiaľ nie sú žiadni agenti</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
