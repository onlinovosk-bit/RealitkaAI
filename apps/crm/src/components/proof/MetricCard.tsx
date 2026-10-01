import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";
import type { ProofMetric } from "@/lib/proof/types";

type MetricCardProps = {
  metric: ProofMetric;
};

export default function MetricCard({ metric }: MetricCardProps) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: SLATE_HORIZON.softBorder,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
        {metric.label}
      </p>
      <p className="mt-1 text-2xl font-extrabold" style={{ color: SLATE_HORIZON.ink }}>
        {metric.value}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
        {metric.hint}
      </p>
    </div>
  );
}
