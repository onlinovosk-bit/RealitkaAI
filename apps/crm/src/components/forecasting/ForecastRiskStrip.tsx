"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { buildForecastRiskSummary } from "@/lib/workdesk/forecast-signals";
import { trackWorkdeskEvent } from "@/lib/workdesk/ai-telemetry";
import type { DealHealthIssue } from "@/lib/forecasting-store";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

type Props = {
  expectedPipelineValue: number;
  expectedClosedDeals: number;
  dealHealth: DealHealthIssue[];
  targetPipelineValue?: number;
  targetClosedDeals?: number;
};

/** Forecast screen NBA — „Čo ohrozuje tento mesiac?" */
export default function ForecastRiskStrip({
  expectedPipelineValue,
  expectedClosedDeals,
  dealHealth,
  targetPipelineValue,
  targetClosedDeals,
}: Props) {
  const summary = buildForecastRiskSummary({
    expectedPipelineValue,
    expectedClosedDeals,
    dealHealth,
    targetPipelineValue,
    targetClosedDeals,
  });

  useEffect(() => {
    trackWorkdeskEvent("forecast_alert_open", {
      gapEur: summary.gapEur,
      atRiskCount: summary.atRiskCount,
    });
  }, [summary.gapEur, summary.atRiskCount]);

  const demoSignals =
    summary.signals.length > 0
      ? summary.signals
      : [
          {
            leadId: "demo-f1",
            leadName: "Martin Kováč",
            riskEur: 54000,
            probabilityPercent: 72,
            note: "Ponuka bez follow-upu",
            kind: "high_value_no_tasks" as const,
          },
          {
            leadId: "demo-f2",
            leadName: "Eva Poláková",
            riskEur: 32000,
            probabilityPercent: 48,
            note: "2 úlohy po termíne",
            kind: "after_deadline_open_tasks" as const,
          },
        ];

  return (
    <section
      className="mb-6 overflow-hidden rounded-2xl border"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: summary.atRiskCount > 0 ? "#FDE68A" : WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <div
        className="flex items-start gap-3 border-b px-4 py-4 md:px-5"
        style={{
          borderColor: SLATE_HORIZON.line,
          background: summary.atRiskCount > 0 ? "#FFFBEB" : SLATE_HORIZON.soft,
        }}
      >
        <AlertTriangle
          size={20}
          className="mt-0.5 shrink-0"
          style={{ color: summary.atRiskCount > 0 ? "#B45309" : SLATE_HORIZON.brandDeep }}
        />
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide" style={{ color: SLATE_HORIZON.brandDeep }}>
            Čo ohrozuje tento mesiac?
          </h2>
          <p className="mt-1 text-base font-bold" style={{ color: SLATE_HORIZON.ink }}>
            {summary.headline}
          </p>
          <p className="mt-0.5 text-sm" style={{ color: SLATE_HORIZON.muted }}>
            {summary.subline}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
        {demoSignals.map((signal) => (
          <Link
            key={signal.leadId}
            href={signal.leadId.startsWith("demo-") ? "/forecasting" : `/leads/${signal.leadId}`}
            onClick={() =>
              trackWorkdeskEvent("forecast_alert_open", {
                leadId: signal.leadId,
                riskEur: signal.riskEur,
              })
            }
            className="rounded-xl border p-3 transition-all hover:shadow-sm"
            style={{ borderColor: SLATE_HORIZON.line }}
          >
            <p className="text-sm font-bold" style={{ color: SLATE_HORIZON.ink }}>
              {signal.leadName}
            </p>
            <p className="mt-1 text-xs" style={{ color: SLATE_HORIZON.muted }}>
              {signal.note}
            </p>
            <p className="mt-2 text-[11px] font-semibold" style={{ color: SLATE_HORIZON.money }}>
              {signal.probabilityPercent}% · ~€{signal.riskEur.toLocaleString("sk-SK")} v riziku
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
