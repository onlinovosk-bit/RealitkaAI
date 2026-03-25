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

function getRiskBadge(risk: string) {
  switch (risk) {
    case "opportunity":
      return "bg-green-100 text-green-700";
    case "risk":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function ScoringTopLeadsTable({
  rows,
}: {
  rows: Array<{
    leadId: string;
    leadName: string;
    score: number;
    band: string;
    riskLevel: string;
    nextBestAction: string;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Top leady podľa AI score</h2>
        <p className="text-sm text-gray-500">
          Prioritizácia leadov podľa správania, matchingu a obchodnej pripravenosti.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Lead</th>
              <th className="px-5 py-3 font-medium">Score</th>
              <th className="px-5 py-3 font-medium">Band</th>
              <th className="px-5 py-3 font-medium">Risk</th>
              <th className="px-5 py-3 font-medium">Next step</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.leadId} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-900">{row.leadName}</td>
                <td className="px-5 py-4 text-gray-700">{row.score}/100</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getBandBadge(row.band)}`}
                  >
                    {row.band}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskBadge(row.riskLevel)}`}
                  >
                    {row.riskLevel}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-700">{row.nextBestAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="border-t border-gray-200 p-5 text-sm text-gray-500">
          Zatiaľ nie sú dostupné žiadne scoring výsledky.
        </div>
      )}
    </div>
  );
}
