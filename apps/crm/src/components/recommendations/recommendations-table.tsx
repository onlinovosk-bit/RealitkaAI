type Row = {
  id: string;
  leadId: string | null;
  propertyId: string | null;
  recommendationType: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  modelVersion: string;
  leadName: string;
  propertyTitle: string;
};

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700";
    case "medium":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function RecommendationsTable({
  rows,
}: {
  rows: Row[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Uložené AI odporúčania</h2>
        <p className="text-sm text-gray-500">
          Persistované odporúčania z tabuľky ai_recommendations.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Lead</th>
              <th className="px-5 py-3 font-medium">Typ odporúčania</th>
              <th className="px-5 py-3 font-medium">Názov</th>
              <th className="px-5 py-3 font-medium">Popis</th>
              <th className="px-5 py-3 font-medium">Priorita</th>
              <th className="px-5 py-3 font-medium">Nehnuteľnosť</th>
              <th className="px-5 py-3 font-medium">Model</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-900">{row.leadName}</td>
                <td className="px-5 py-4 text-gray-700">{row.recommendationType}</td>
                <td className="px-5 py-4 font-medium text-gray-900">{row.title}</td>
                <td className="px-5 py-4 text-gray-700">{row.description}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityBadge(row.priority)}`}>
                    {row.priority}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-700">{row.propertyTitle || "-"}</td>
                <td className="px-5 py-4 text-gray-700">{row.modelVersion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="border-t border-gray-200 p-5 text-sm text-gray-500">
          Zatiaľ nie sú uložené žiadne AI odporúčania. Najprv klikni na „Prepočítať odporúčania“.
        </div>
      )}
    </div>
  );
}
