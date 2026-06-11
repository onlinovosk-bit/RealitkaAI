"use client";

const EXPORTS = [
  { kind: "summary", label: "Export summary CSV" },
  { kind: "ai-cost", label: "Export AI cost daily CSV" },
  { kind: "trends", label: "Export 4-week trends CSV" },
] as const;

export default function FounderMetricsExportButtons() {
  return (
    <div className="flex flex-wrap gap-2" data-testid="founder-metrics-export-buttons">
      {EXPORTS.map(({ kind, label }) => (
        <a
          key={kind}
          href={`/api/internal/metrics/export?kind=${kind}`}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-700"
          download
        >
          {label}
        </a>
      ))}
    </div>
  );
}
