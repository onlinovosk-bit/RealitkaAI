"use client";
import { useEffect, useState } from "react";
import type { DealStrategy } from "@/lib/ai/deal-strategy";
import {
  SLATE_HORIZON,
  WORKDESK_CARD,
  WORKDESK_INNER_ROW,
} from "@/lib/slate-horizon-theme";

export default function DealStrategyCard({ leadId }: { leadId: string }) {
  const [strategy, setStrategy] = useState<DealStrategy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leads/${leadId}/deal-strategy`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setStrategy(d.strategy); })
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
  if (!strategy) return null;

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <h3 className="text-sm font-semibold mb-2" style={{ color: SLATE_HORIZON.ink }}>Deal stratégia</h3>
      <p className="text-xs mb-2" style={{ color: SLATE_HORIZON.navText }}>{strategy.summary}</p>
      <p className="text-xs font-medium mb-1" style={{ color: SLATE_HORIZON.muted }}>Ďalšie kroky:</p>
      <ul className="space-y-1">
        {strategy.nextSteps.map((s) => (
          <li key={s} className="text-xs" style={{ color: SLATE_HORIZON.navText }}>• {s}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs" style={{ color: SLATE_HORIZON.brandDeep }}>Technika: {strategy.closingTechnique}</p>
    </div>
  );
}
