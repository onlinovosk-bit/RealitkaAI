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

export default function RecommendationsOverview({
  rows,
}: {
  rows: Array<{
    id: string;
    leadName: string;
    title: string;
    description: string;
    priority: string;
  }>;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">AI odporúčania</h2>
        <p className="text-sm text-gray-500">
          Najdôležitejšie odporúčania pre manažéra a tím.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-gray-900">{row.title}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityBadge(row.priority)}`}>
                {row.priority}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-700">{row.description}</p>
            <p className="mt-2 text-xs text-gray-500">Lead: {row.leadName}</p>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
            Zatiaľ nie sú dostupné AI odporúčania.
          </div>
        )}
      </div>
    </div>
  );
}
