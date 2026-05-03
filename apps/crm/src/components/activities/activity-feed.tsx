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

function getSeverityBadge(severity: string): React.CSSProperties {
  switch (severity) {
    case "warning":
      return { background: "rgba(234,179,8,0.14)", color: "#FCD34D" };
    case "error":
      return { background: "rgba(239,68,68,0.14)", color: "#FCA5A5" };
    case "success":
      return { background: "rgba(34,197,94,0.14)", color: "#86EFAC" };
    default:
      return { background: "rgba(100,116,139,0.14)", color: "#94A3B8" };
  }
}

function getSourceBadge(source: string): React.CSSProperties {
  switch (source) {
    case "crm":
      return { background: "rgba(59,130,246,0.14)", color: "#93C5FD" };
    case "pipeline":
      return { background: "rgba(168,85,247,0.14)", color: "#D8B4FE" };
    case "inventory":
      return { background: "rgba(34,197,94,0.14)", color: "#86EFAC" };
    case "matching":
      return { background: "rgba(249,115,22,0.14)", color: "#FDB28E" };
    case "team":
      return { background: "rgba(236,72,153,0.14)", color: "#F9A8D4" };
    default:
      return { background: "rgba(100,116,139,0.14)", color: "#94A3B8" };
  }
}

function formatSourceLabel(source: string) {
  if (source === "pipeline") return "stav klientov";
  return source;
}

import React from "react";

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
          className="rounded-2xl border p-5"
          style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold" style={{ color: "#F0F9FF" }}>
                  {row.title || row.type}
                </h3>

                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={getSourceBadge(row.source)}
                >
                  {formatSourceLabel(row.source)}
                </span>

                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={getSeverityBadge(row.severity)}
                >
                  {row.severity}
                </span>
              </div>

              <p className="mt-2 text-sm" style={{ color: "#94A3B8" }}>{row.text}</p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs" style={{ color: "#475569" }}>
                {canSeeEntityMeta && <span>Typ entity: {row.entityType}</span>}
                {canSeeEntityMeta && row.entityId && <span>ID entity: {row.entityId}</span>}
                {row.actorName && <span>Aktor: {row.actorName}</span>}
              </div>
            </div>

            <div className="text-xs" style={{ color: "#475569" }}>
              {new Date(row.createdAt).toLocaleString("sk-SK")}
            </div>
          </div>
        </div>
      ))}

      {rows.length === 0 && (
        <div
          className="rounded-2xl border border-dashed p-5 text-sm"
          style={{ borderColor: "#0F1F3D", background: "#080D1A", color: "#475569" }}
        >
          Zatiaľ nie sú dostupné žiadne systémové aktivity.
        </div>
      )}
    </div>
  );
}
