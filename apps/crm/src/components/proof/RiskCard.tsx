import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";
import type { ProofRisk } from "@/lib/proof/types";

const SEVERITY_COLOR: Record<ProofRisk["severity"], string> = {
  high: SLATE_HORIZON.danger,
  medium: SLATE_HORIZON.amber,
  low: SLATE_HORIZON.brandDeep,
};

type RiskCardProps = {
  risk: ProofRisk;
};

export default function RiskCard({ risk }: RiskCardProps) {
  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.bg }}
    >
      <p className="text-sm font-semibold" style={{ color: SEVERITY_COLOR[risk.severity] }}>
        {risk.title}
      </p>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
        {risk.detail}
      </p>
    </div>
  );
}
