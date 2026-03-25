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

export default function ScoringInsightsPanel({
  rows,
}: {
  rows: Array<{
    leadId: string;
    leadName: string;
    band: string;
    reasons: string[];
    nextBestAction: string;
  }>;
}) {
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div
          key={row.leadId}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{row.leadName}</h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getBandBadge(row.band)}`}
            >
              {row.band}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {row.reasons.map((reason) => (
              <span
                key={reason}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {reason}
              </span>
            ))}
          </div>

          <p className="mt-4 text-sm text-gray-700">{row.nextBestAction}</p>
        </div>
      ))}

      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-500">
          Zatiaľ nie sú dostupné žiadne scoring insights.
        </div>
      )}
    </div>
  );
}
