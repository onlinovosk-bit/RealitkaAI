function getBandBadge(band: string) {
  switch (band) {
    case "critical":
      return "bg-red-100 text-red-700";
    case "high":
      return "bg-orange-100 text-orange-700";
    case "medium":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function PipelineForecastPanel({
  rows,
}: {
  rows: Array<{
    leadId: string;
    leadName: string;
    assignedAgent: string;
    status: string;
    aiScore: number;
    band: string;
    probability: number;
    expectedDealValue: number;
    weightedValue: number;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Forecast pipeline</h2>
        <p className="text-sm text-gray-500">
          Najsilnejsie leady podla ocakavanej obchodnej hodnoty.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Lead</th>
              <th className="px-5 py-3 font-medium">Makler</th>
              <th className="px-5 py-3 font-medium">Stav</th>
              <th className="px-5 py-3 font-medium">AI score</th>
              <th className="px-5 py-3 font-medium">Pravdepodobnost</th>
              <th className="px-5 py-3 font-medium">Potencial</th>
              <th className="px-5 py-3 font-medium">Weighted value</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.leadId} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-900">{row.leadName}</td>
                <td className="px-5 py-4 text-gray-700">{row.assignedAgent}</td>
                <td className="px-5 py-4 text-gray-700">{row.status}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getBandBadge(row.band)}`}>
                    {row.aiScore}/100
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-700">{Math.round(row.probability * 100)} %</td>
                <td className="px-5 py-4 text-gray-700">{row.expectedDealValue.toLocaleString("sk-SK")} EUR</td>
                <td className="px-5 py-4 text-gray-700">{row.weightedValue.toLocaleString("sk-SK")} EUR</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="border-t border-gray-200 p-5 text-sm text-gray-500">
          Zatial nie su dostupne forecast data.
        </div>
      )}
    </div>
  );
}
