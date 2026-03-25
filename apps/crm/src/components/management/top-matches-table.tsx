export default function TopMatchesTable({
  rows,
}: {
  rows: Array<{
    id: string;
    leadName: string;
    propertyId: string;
    matchScore: number;
    reasons: string[];
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Top matching zhody</h2>
        <p className="text-sm text-gray-500">
          Najsilnejšie zhody medzi leadmi a nehnuteľnosťami.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Lead</th>
              <th className="px-5 py-3 font-medium">Property ID</th>
              <th className="px-5 py-3 font-medium">Zhoda</th>
              <th className="px-5 py-3 font-medium">Dôvody</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-900">{row.leadName}</td>
                <td className="px-5 py-4 text-gray-700">{row.propertyId}</td>
                <td className="px-5 py-4 text-gray-700">{row.matchScore}/100</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="border-t border-gray-200 p-5 text-sm text-gray-500">
          Zatiaľ nie sú dostupné matching zhody.
        </div>
      )}
    </div>
  );
}
