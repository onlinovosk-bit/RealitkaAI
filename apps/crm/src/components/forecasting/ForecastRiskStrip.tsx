"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { buildForecastRiskSummary } from "@/lib/workdesk/forecast-signals";
import { trackWorkdeskEvent } from "@/lib/workdesk/ai-telemetry";
import type { DealHealthIssue } from "@/lib/forecasting-store";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

type Props = {
  totalLeads: number;
  expectedPipelineValue: number;
  expectedClosedDeals: number;
  dealHealth: DealHealthIssue[];
  targetPipelineValue?: number;
  targetClosedDeals?: number;
};

/** Forecast screen NBA — „Čo ohrozuje tento mesiac?" (iba reálne dealHealth z CRM). */
export default function ForecastRiskStrip({
  totalLeads,
  expectedPipelineValue,
  expectedClosedDeals,
  dealHealth,
  targetPipelineValue,
  targetClosedDeals,
}: Props) {
  const summary = buildForecastRiskSummary({
    totalLeads,
    expectedPipelineValue,
    expectedClosedDeals,
    dealHealth,
    targetPipelineValue,
    targetClosedDeals,
  });

  const hasLeads = totalLeads > 0;
  const signals = summary.signals;

  useEffect(() => {
    trackWorkdeskEvent("forecast_alert_open", {
      gapEur: summary.gapEur,
      atRiskCount: summary.atRiskCount,
      totalLeads,
    });
  }, [summary.gapEur, summary.atRiskCount, totalLeads]);

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

      {!hasLeads ? (
        <p className="px-4 py-6 text-center text-sm" style={{ color: SLATE_HORIZON.muted }}>
          Zatiaľ nie sú dáta na predikciu rizika.
        </p>
      ) : signals.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm" style={{ color: SLATE_HORIZON.muted }}>
          Žiadne kritické dealy v tomto mesiaci — pipeline drží cieľ alebo nie sú otvorené riziká z úloh.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
          {signals.map((signal) => (
            <Link
              key={signal.leadId}
              href={`/leads/${signal.leadId}`}
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
      )}
    </section>
  );
}
