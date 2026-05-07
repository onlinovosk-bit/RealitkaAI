"use client";
import { useEffect, useState } from "react";
import type { SalesBrainInsight } from "@/lib/ai/sales-brain";

const PRIORITY_COLOR = {
  high:   "text-red-400",
  medium: "text-amber-400",
  low:    "text-slate-400",
} as const;

const CONFIDENCE_STYLE = {
  high:   { label: "Vysoká istota",   bg: "rgba(34,197,94,0.12)",  color: "#22C55E" },
  medium: { label: "Stredná istota",  bg: "rgba(234,179,8,0.12)",  color: "#EAB308" },
  low:    { label: "Nízka istota",    bg: "rgba(239,68,68,0.12)",  color: "#EF4444" },
} as const;

export default function SalesBrainPanel({ leadId }: { leadId: string }) {
  const [insight, setInsight]   = useState<SalesBrainInsight | null>(null);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/leads/${leadId}/sales-brain`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setInsight(d.insight); })
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) return <div className="animate-pulse h-24 rounded-xl bg-white/5" />;
  if (!insight) return null;

  const conf = CONFIDENCE_STYLE[insight.confidence ?? "medium"];

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">AI Sales Brain</h3>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: conf.bg, color: conf.color }}
        >
          {conf.label}
        </span>
      </div>

      {/* Headline + action */}
      <p className={`text-sm font-bold ${PRIORITY_COLOR[insight.priority]}`}>
        {insight.headline}
      </p>
      <p className="text-xs text-cyan-300">→ {insight.suggestedAction}</p>

      {/* "Prečo?" expandable — data trace (Wang round table) */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-[11px] transition-colors"
        style={{ color: expanded ? "#22D3EE" : "#475569" }}
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        Prečo toto odporúčanie?
      </button>

      {expanded && (
        <div
          className="rounded-xl p-3 space-y-1"
          style={{ background: "rgba(34,211,238,0.04)", border: "1px solid rgba(34,211,238,0.08)" }}
        >
          <p className="text-[11px] font-medium mb-1.5" style={{ color: "#94A3B8" }}>
            Dátové body:
          </p>
          {(insight.data_points ?? []).map((point, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0 text-[9px]" style={{ color: "#22D3EE" }}>▸</span>
              <span className="text-[11px]" style={{ color: "#CBD5E1" }}>{point}</span>
            </div>
          ))}
          <p className="pt-1.5 text-[11px]" style={{ color: "#64748B" }}>
            {insight.reasoning}
          </p>
        </div>
      )}
    </div>
  );
}
