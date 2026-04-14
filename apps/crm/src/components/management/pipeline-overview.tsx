function getStageBadge(label: string) {
  switch (label) {
    case "Nový":
      return "bg-gray-100 text-gray-700";
    case "Teplý":
      return "bg-yellow-100 text-yellow-700";
    case "Horúci":
      return "bg-green-100 text-green-700";
    case "Obhliadka":
      return "bg-blue-100 text-blue-700";
    case "Ponuka":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function PipelineOverview({
  rows,
}: {
  rows: Array<{ label: string; count: number }>;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Prehľad stavu klientov</h2>
        <p className="text-sm text-gray-500">
          Stav príležitostí naprieč celým obchodným procesom.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStageBadge(row.label)}`}>
                {row.label}
              </span>
              <span className="text-sm font-semibold text-gray-900">{row.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
