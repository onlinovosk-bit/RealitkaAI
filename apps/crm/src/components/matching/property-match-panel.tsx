type Row = {
  propertyId: string;
  propertyTitle: string;
  count: number;
  avgScore: number;
};

export default function PropertyMatchPanel({
  rows,
}: {
  rows: Row[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Top nehnuteľnosti podľa matchingu</h2>
        <p className="text-sm text-gray-500">
          Ktoré nehnuteľnosti sa najčastejšie a najlepšie párujú s leadmi.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Nehnuteľnosť</th>
              <th className="px-5 py-3 font-medium">Počet zhôd</th>
              <th className="px-5 py-3 font-medium">Priemerné score</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.propertyId} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-900">{row.propertyTitle}</td>
                <td className="px-5 py-4 text-gray-700">{row.count}</td>
                <td className="px-5 py-4 text-gray-700">{row.avgScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="border-t border-gray-200 p-5 text-sm text-gray-500">
          Zatiaľ nie sú dostupné žiadne property matching dáta.
        </div>
      )}
    </div>
  );
}
