export default function SourceBenchmarkTable({
  rows,
}: {
  rows: Array<{
    source: string;
    count: number;
    avgScore: number;
    expectedValue: number;
    criticalCount: number;
    opportunityCount: number;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Benchmark zdrojov leadov</h2>
        <p className="text-sm text-gray-500">
          Ktore zdroje prinasaju najvyssiu ocakavanu hodnotu.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Zdroj</th>
              <th className="px-5 py-3 font-medium">Pocet leadov</th>
              <th className="px-5 py-3 font-medium">Priemerny score</th>
              <th className="px-5 py-3 font-medium">Critical</th>
              <th className="px-5 py-3 font-medium">Opportunity</th>
              <th className="px-5 py-3 font-medium">Expected value</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.source} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-900">{row.source}</td>
                <td className="px-5 py-4 text-gray-700">{row.count}</td>
                <td className="px-5 py-4 text-gray-700">{row.avgScore}</td>
                <td className="px-5 py-4 text-gray-700">{row.criticalCount}</td>
                <td className="px-5 py-4 text-gray-700">{row.opportunityCount}</td>
                <td className="px-5 py-4 text-gray-700">{row.expectedValue.toLocaleString("sk-SK")} EUR</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="border-t border-gray-200 p-5 text-sm text-gray-500">
          Zatial nie su dostupne ziadne benchmarky zdrojov.
        </div>
      )}
    </div>
  );
}
