"use client";
import { useEffect, useState } from "react";
import type { SalesBrainInsight } from "@/lib/ai/sales-brain";
import {
  SLATE_HORIZON,
  WORKDESK_CARD,
  WORKDESK_INNER_ROW,
} from "@/lib/slate-horizon-theme";

const PRIORITY_COLOR = {
  high:   "text-red-600",
  medium: "text-amber-600",
  low:    "text-slate-500",
} as const;

const CONFIDENCE_STYLE = {
  high:   { label: "Vysoká istota",   bg: "#DCFCE7", color: SLATE_HORIZON.greenDark },
  medium: { label: "Stredná istota",  bg: "#FEF3C7", color: "#92400E" },
  low:    { label: "Nízka istota",    bg: "#FEE2E2", color: SLATE_HORIZON.danger },
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

  if (loading) {
    return (
      <div
        className="animate-pulse h-24 rounded-xl"
        style={{ background: WORKDESK_INNER_ROW.background }}
      />
    );
  }
  if (!insight) return null;

  const conf = CONFIDENCE_STYLE[insight.confidence ?? "medium"];

  return (
    <div
      className="rounded-2xl border p-4 space-y-2"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold" style={{ color: SLATE_HORIZON.ink }}>AI Sales Brain</h3>
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
      <p className="text-xs" style={{ color: SLATE_HORIZON.brandDeep }}>→ {insight.suggestedAction}</p>

      {/* "Prečo?" expandable — data trace (Wang round table) */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-[11px] transition-colors"
        style={{ color: expanded ? SLATE_HORIZON.brand : SLATE_HORIZON.muted }}
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
          style={{
            background: SLATE_HORIZON.soft,
            border: `1px solid ${SLATE_HORIZON.softBorder}`,
          }}
        >
          <p className="text-[11px] font-medium mb-1.5" style={{ color: SLATE_HORIZON.muted }}>
            Dátové body:
          </p>
          {(insight.data_points ?? []).map((point, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0 text-[9px]" style={{ color: SLATE_HORIZON.brand }}>▸</span>
              <span className="text-[11px]" style={{ color: SLATE_HORIZON.navText }}>{point}</span>
            </div>
          ))}
          <p className="pt-1.5 text-[11px]" style={{ color: SLATE_HORIZON.muted }}>
            {insight.reasoning}
          </p>
        </div>
      )}
    </div>
  );
}
