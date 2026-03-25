type Row = {
  id: string;
  leadName: string;
  title: string;
  description: string;
  priority: string;
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

export default function RecommendationsFeed({
  rows,
}: {
  rows: Row[];
}) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900">{row.title}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityBadge(row.priority)}`}>
                  {row.priority}
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-700">{row.description}</p>
              <p className="mt-3 text-xs text-gray-500">Lead: {row.leadName}</p>
            </div>
          </div>
        </div>
      ))}

      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-500">
          Zatiaľ nie sú dostupné žiadne AI odporúčania.
        </div>
      )}
    </div>
  );
}
