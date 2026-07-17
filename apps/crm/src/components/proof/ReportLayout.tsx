import type { ProofReport } from "@/lib/proof/types";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";
import MetricCard from "./MetricCard";
import RiskCard from "./RiskCard";
import CallToAction from "./CallToAction";

type ReportLayoutProps = {
  report: ProofReport;
  leadCaptureWarning?: string | null;
};

export default function ReportLayout({ report, leadCaptureWarning }: ReportLayoutProps) {
  return (
    <section className="animate-in fade-in duration-500">
      {leadCaptureWarning && (
        <p
          className="mb-6 rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: SLATE_HORIZON.line,
            color: SLATE_HORIZON.muted,
            background: WORKDESK_CARD.background,
          }}
        >
          {leadCaptureWarning}
        </p>
      )}
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: SLATE_HORIZON.muted }}>
          Revenue Health Index (odhad)
        </p>
        <p className="mt-2 text-5xl font-black" style={{ color: SLATE_HORIZON.brandDeep }}>
          {report.revenueHealthScore}
          <span className="text-2xl font-bold" style={{ color: SLATE_HORIZON.muted }}>
            /100
          </span>
        </p>
        <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
          {report.disclaimer}
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {report.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="mt-8 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: SLATE_HORIZON.ink }}>
          Riziká a príležitosti
        </h3>
        {report.risks.map((risk) => (
          <RiskCard key={risk.id} risk={risk} />
        ))}
      </div>

      <CallToAction />
    </section>
  );
}
