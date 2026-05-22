"use client";

import { useEffect } from "react";
import ModuleShell from "@/components/shared/module-shell";
import EmptyState from "@/components/shared/empty-state";
import FeatureGateBanner from "@/components/shared/feature-gate-banner";
import ForecastKpis from "@/components/forecasting/forecast-kpis";
import PipelineForecastPanel from "@/components/forecasting/pipeline-forecast-panel";
import SourceBenchmarkTable from "@/components/forecasting/source-benchmark-table";
import AgentBenchmarkTable from "@/components/forecasting/agent-benchmark-table";
import StageBenchmarkTable from "@/components/forecasting/stage-benchmark-table";
import DealHealthPanel from "@/components/forecasting/deal-health-panel";
import ForecastRiskStrip from "@/components/forecasting/ForecastRiskStrip";
import { PremiumLockedBlur, PremiumLockedOverlay } from "@/components/license/PremiumLockedOverlay";
import { useLicenseCapabilities } from "@/hooks/useLicenseCapabilities";
import { trackRevenueTelemetry } from "@/lib/analytics/revenue-telemetry";
import type { DealHealthIssue } from "@/lib/forecasting-store";

type ForecastPageClientProps = {
  accountTier: string | null;
  data: {
    kpis: {
      totalLeads: number;
      expectedClosedDeals: number;
      expectedPipelineValue: number;
      avgProbabilityPercent: number;
    };
    topForecastLeads: Array<{
      leadId: string;
      leadName: string;
      assignedAgent: string;
      status: string;
      aiScore: number;
      band: string;
      probability: number;
      expectedDealValue: number;
      weightedValue: number;
    }>;
    dealHealth: DealHealthIssue[];
    sourceBenchmarks: Array<{
      source: string;
      count: number;
      avgScore: number;
      expectedValue: number;
      criticalCount: number;
      opportunityCount: number;
    }>;
    agentBenchmarks: Array<{
      agent: string;
      count: number;
      avgScore: number;
      expectedValue: number;
      hotCount: number;
      criticalCount: number;
      openTasks: number;
    }>;
    stageBenchmarks: Array<{
      stage: string;
      count: number;
      avgScore: number;
      avgProbability: number;
      expectedValue: number;
    }>;
  };
};

export default function ForecastPageClient({ accountTier, data }: ForecastPageClientProps) {
  const { can } = useLicenseCapabilities(accountTier);
  const canViewForecast = can("canViewForecast");

  useEffect(() => {
    void trackRevenueTelemetry("forecast_open", {
      canViewForecast,
      accountTier: accountTier ?? "unknown",
    });
  }, [canViewForecast, accountTier]);

  const cards = [
    {
      title: "Všetky leady",
      value: data.kpis.totalLeads,
      subtitle: "Základ pre forecast",
    },
    {
      title: "Expected closed deals",
      value: data.kpis.expectedClosedDeals,
      subtitle: "Odhad počtu uzavretých obchodov",
    },
    {
      title: "Očakávaná hodnota stavu klientov",
      value: `${data.kpis.expectedPipelineValue.toLocaleString("sk-SK")} €`,
      subtitle: "Vážený objem stavu klientov",
    },
    {
      title: "Avg probability",
      value: `${data.kpis.avgProbabilityPercent} %`,
      subtitle: "Priemerná pravdepodobnosť uzavretia",
    },
  ];

  return (
    <ModuleShell
      title="Forecasting & Benchmarky"
      description="Predikcia stavu klientov, benchmark zdrojov príležitostí, výkonu agentov a stavov príležitostí."
    >
      {canViewForecast ? (
        <FeatureGateBanner
          description="Forecasting je dostupný v tvojom aktuálnom pláne."
          title="Forecasting je aktívny"
        />
      ) : null}

      <div className="relative mt-6 min-h-[420px]">
        <PremiumLockedBlur active={!canViewForecast}>
          <div className={canViewForecast ? undefined : "pointer-events-none select-none"}>
            <ForecastRiskStrip
              expectedPipelineValue={data.kpis.expectedPipelineValue}
              expectedClosedDeals={data.kpis.expectedClosedDeals}
              dealHealth={data.dealHealth}
            />

            <div className="mt-6">
              <ForecastKpis cards={cards} />
            </div>

            {data.topForecastLeads.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Zatiaľ nie sú dostupné forecast dáta"
                  description="Najprv potrebuješ leady, scoring a dáta o stave klientov."
                />
              </div>
            ) : (
              <>
                <section className="mt-6">
                  <PipelineForecastPanel rows={data.topForecastLeads} />
                </section>

                <section className="mt-6">
                  <DealHealthPanel rows={data.dealHealth} />
                </section>

                <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <SourceBenchmarkTable rows={data.sourceBenchmarks} />
                  <AgentBenchmarkTable rows={data.agentBenchmarks} />
                </section>

                <section className="mt-6">
                  <StageBenchmarkTable rows={data.stageBenchmarks} />
                </section>
              </>
            )}
          </div>
        </PremiumLockedBlur>

        {!canViewForecast ? (
          <PremiumLockedOverlay
            capability="canViewForecast"
            headline="Kde dnes inkasuješ — a kde uniká provízia."
            subline="Odomkni Radar a uvidíš pipeline peniaze, benchmarky agentov a riziká mesiaca."
          />
        ) : null}
      </div>
    </ModuleShell>
  );
}
