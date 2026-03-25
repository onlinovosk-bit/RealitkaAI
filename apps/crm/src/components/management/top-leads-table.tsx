export default function TopLeadsTable({
  rows,
}: {
  rows: Array<{
    id: string;
    name: string;
    location: string;
    status: string;
    score: number;
    assignedAgent: string;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Top leady</h2>
        <p className="text-sm text-gray-500">
          Najkvalitnejšie leady podľa score.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Meno</th>
              <th className="px-5 py-3 font-medium">Lokalita</th>
              <th className="px-5 py-3 font-medium">Stav</th>
              <th className="px-5 py-3 font-medium">Score</th>
              <th className="px-5 py-3 font-medium">Maklér</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-900">{row.name}</td>
                <td className="px-5 py-4 text-gray-700">{row.location}</td>
                <td className="px-5 py-4 text-gray-700">{row.status}</td>
                <td className="px-5 py-4 text-gray-700">{row.score}</td>
                <td className="px-5 py-4 text-gray-700">{row.assignedAgent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="border-t border-gray-200 p-5 text-sm text-gray-500">
          Zatiaľ nie sú dostupné žiadne leady.
        </div>
      )}
    </div>
  );
}
