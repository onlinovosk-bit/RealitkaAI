type Row = {
  id: string;
  leadId: string;
  propertyId: string;
  matchScore: number;
  reasons: string[];
  modelVersion: string;
  leadName: string;
  propertyTitle: string;
  propertyLocation: string;
  propertyPrice: number;
};

function getScoreBadge(score: number) {
  if (score >= 85) return "bg-green-100 text-green-700";
  if (score >= 70) return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-700";
}

export default function MatchesTable({
  rows,
}: {
  rows: Row[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Uložené zhody</h2>
        <p className="text-sm text-gray-500">
          Matching klient ↔ nehnuteľnosť zapisovaný do tabuľky lead_property_matches.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Lead</th>
              <th className="px-5 py-3 font-medium">Nehnuteľnosť</th>
              <th className="px-5 py-3 font-medium">Lokalita</th>
              <th className="px-5 py-3 font-medium">Cena</th>
              <th className="px-5 py-3 font-medium">Zhoda</th>
              <th className="px-5 py-3 font-medium">Dôvody</th>
              <th className="px-5 py-3 font-medium">Model</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-900">{row.leadName}</td>
                <td className="px-5 py-4 text-gray-700">{row.propertyTitle}</td>
                <td className="px-5 py-4 text-gray-700">{row.propertyLocation}</td>
                <td className="px-5 py-4 text-gray-700">
                  {row.propertyPrice.toLocaleString("sk-SK")} €
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getScoreBadge(row.matchScore)}`}>
                    {row.matchScore}/100
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-700">
                  <div className="flex flex-wrap gap-2">
                    {row.reasons.map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-700">{row.modelVersion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="border-t border-gray-200 p-5 text-sm text-gray-500">
          Zatiaľ nie sú uložené žiadne matching záznamy. Najprv klikni na „Prepočítať matching".
        </div>
      )}
    </div>
  );
}
