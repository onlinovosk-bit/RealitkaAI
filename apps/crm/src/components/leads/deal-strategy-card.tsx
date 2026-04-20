"use client";
import { useEffect, useState } from "react";
import type { DealStrategy } from "@/lib/ai/deal-strategy";

export default function DealStrategyCard({ leadId }: { leadId: string }) {
  const [strategy, setStrategy] = useState<DealStrategy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leads/${leadId}/deal-strategy`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setStrategy(d.strategy); })
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) return <div className="animate-pulse h-24 rounded-xl bg-white/5" />;
  if (!strategy) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-white mb-2">Deal stratégia</h3>
      <p className="text-xs text-slate-300 mb-2">{strategy.summary}</p>
      <p className="text-xs font-medium text-slate-400 mb-1">Ďalšie kroky:</p>
      <ul className="space-y-1">
        {strategy.nextSteps.map((s) => (
          <li key={s} className="text-xs text-slate-300">• {s}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-cyan-300">Technika: {strategy.closingTechnique}</p>
    </div>
  );
}
