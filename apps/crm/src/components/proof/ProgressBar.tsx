import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";

type ProgressBarProps = {
  step: number;
  total: number;
};

export default function ProgressBar({ step, total }: ProgressBarProps) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="mb-6">
      <div className="mb-2 flex justify-between text-xs" style={{ color: SLATE_HORIZON.muted }}>
        <span>
          Krok {step} / {total}
        </span>
        <span>{pct} %</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: SLATE_HORIZON.line }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: SLATE_HORIZON.brandDeep }}
        />
      </div>
    </div>
  );
}
