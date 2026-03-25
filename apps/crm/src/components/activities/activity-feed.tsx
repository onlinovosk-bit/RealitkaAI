type ActivityRow = {
  id: string;
  leadId: string | null;
  profileId: string | null;
  type: string;
  title: string;
  text: string;
  entityType: string;
  entityId: string | null;
  actorName: string;
  source: string;
  severity: string;
  meta: Record<string, unknown>;
  createdAt: string;
};

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "warning":
      return "bg-yellow-100 text-yellow-700";
    case "error":
      return "bg-red-100 text-red-700";
    case "success":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getSourceBadge(source: string) {
  switch (source) {
    case "crm":
      return "bg-blue-100 text-blue-700";
    case "pipeline":
      return "bg-purple-100 text-purple-700";
    case "inventory":
      return "bg-green-100 text-green-700";
    case "matching":
      return "bg-orange-100 text-orange-700";
    case "team":
      return "bg-pink-100 text-pink-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function ActivityFeed({
  rows,
  canSeeEntityMeta = false,
}: {
  rows: ActivityRow[];
  canSeeEntityMeta?: boolean;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.id}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900">
                  {row.title || row.type}
                </h3>

                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getSourceBadge(row.source)}`}>
                  {row.source}
                </span>

                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getSeverityBadge(row.severity)}`}>
                  {row.severity}
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-700">{row.text}</p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                {canSeeEntityMeta && <span>Typ entity: {row.entityType}</span>}
                {canSeeEntityMeta && row.entityId && <span>ID entity: {row.entityId}</span>}
                {row.actorName && <span>Aktor: {row.actorName}</span>}
              </div>
            </div>

            <div className="text-xs text-gray-500">
              {new Date(row.createdAt).toLocaleString("sk-SK")}
            </div>
          </div>
        </div>
      ))}

      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-500">
          Zatiaľ nie sú dostupné žiadne systémové aktivity.
        </div>
      )}
    </div>
  );
}
