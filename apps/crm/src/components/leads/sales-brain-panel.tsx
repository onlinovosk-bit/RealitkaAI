"use client";
import { useEffect, useState } from "react";
import type { SalesBrainInsight } from "@/lib/ai/sales-brain";

export default function SalesBrainPanel({ leadId }: { leadId: string }) {
  const [insight, setInsight] = useState<SalesBrainInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leads/${leadId}/sales-brain`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setInsight(d.insight); })
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) return <div className="animate-pulse h-20 rounded-xl bg-white/5" />;
  if (!insight) return null;

  const colors = { high: "text-red-400", medium: "text-amber-400", low: "text-slate-400" };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-white mb-2">AI Sales Brain</h3>
      <p className={`text-sm font-bold ${colors[insight.priority]}`}>{insight.headline}</p>
      <p className="mt-1 text-xs text-slate-400">{insight.reasoning}</p>
      <p className="mt-2 text-xs text-cyan-300">→ {insight.suggestedAction}</p>
    </div>
  );
}
