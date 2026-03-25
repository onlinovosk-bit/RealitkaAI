export default function AgentBenchmarkTable({
  rows,
}: {
  rows: Array<{
    agent: string;
    count: number;
    avgScore: number;
    expectedValue: number;
    hotCount: number;
    criticalCount: number;
    openTasks: number;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Benchmark agentov</h2>
        <p className="text-sm text-gray-500">
          Kto ma na starosti leady s najvyssou ocakavanou hodnotou.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Makler</th>
              <th className="px-5 py-3 font-medium">Leady</th>
              <th className="px-5 py-3 font-medium">Priemerny score</th>
              <th className="px-5 py-3 font-medium">Horuce</th>
              <th className="px-5 py-3 font-medium">Critical</th>
              <th className="px-5 py-3 font-medium">Open tasks</th>
              <th className="px-5 py-3 font-medium">Expected value</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.agent} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-900">{row.agent}</td>
                <td className="px-5 py-4 text-gray-700">{row.count}</td>
                <td className="px-5 py-4 text-gray-700">{row.avgScore}</td>
                <td className="px-5 py-4 text-gray-700">{row.hotCount}</td>
                <td className="px-5 py-4 text-gray-700">{row.criticalCount}</td>
                <td className="px-5 py-4 text-gray-700">{row.openTasks}</td>
                <td className="px-5 py-4 text-gray-700">{row.expectedValue.toLocaleString("sk-SK")} EUR</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="border-t border-gray-200 p-5 text-sm text-gray-500">
          Zatial nie su dostupne ziadne benchmarky agentov.
        </div>
      )}
    </div>
  );
}
