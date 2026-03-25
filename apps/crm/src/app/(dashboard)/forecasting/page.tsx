import ModuleShell from "@/components/shared/module-shell";
import ErrorState from "@/components/shared/error-state";
import EmptyState from "@/components/shared/empty-state";
import LockedFeatureCard from "@/components/shared/locked-feature-card";
import FeatureGateBanner from "@/components/shared/feature-gate-banner";
import ForecastKpis from "@/components/forecasting/forecast-kpis";
import PipelineForecastPanel from "@/components/forecasting/pipeline-forecast-panel";
import SourceBenchmarkTable from "@/components/forecasting/source-benchmark-table";
import AgentBenchmarkTable from "@/components/forecasting/agent-benchmark-table";
import StageBenchmarkTable from "@/components/forecasting/stage-benchmark-table";
import { safeServerAction } from "@/lib/safe-action";
import { getForecastingData } from "@/lib/forecasting-store";
import { requireRole } from "@/lib/permissions";
import { getFeatureGateState } from "@/lib/feature-gating";

export default async function ForecastingPage() {
  await requireRole(["owner", "manager"]);

  const gate = await getFeatureGateState("forecasting");

  if (!gate.enabled) {
    return (
      <ModuleShell
        title="Forecasting & Benchmarky"
        description="Predikcia pipeline, benchmark zdrojov leadov, výkonu agentov a pipeline stavov."
      >
        <LockedFeatureCard
          title="Forecasting je zamknutý"
          description={gate.reason || "Táto funkcia nie je dostupná pre aktuálny plán."}
        />
      </ModuleShell>
    );
  }

  const result = await safeServerAction(
    () => getForecastingData(),
    "Nepodarilo sa načítať forecasting a benchmarky."
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="Forecasting & Benchmarky"
        description="Predikcia pipeline, benchmark zdrojov leadov, výkonu agentov a pipeline stavov."
      >
        <ErrorState
          title="Forecasting sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const data = result.data;

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
      title: "Expected pipeline value",
      value: `${data.kpis.expectedPipelineValue.toLocaleString("sk-SK")} €`,
      subtitle: "Vážený objem pipeline",
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
      description="Predikcia pipeline, benchmark zdrojov leadov, výkonu agentov a pipeline stavov."
    >
      <FeatureGateBanner description="Forecasting je dostupný v tvojom aktuálnom pláne." title="Forecasting je aktívny" />
      <div className="mt-6">
        <ForecastKpis cards={cards} />
      </div>

      {data.topForecastLeads.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Zatiaľ nie sú dostupné forecast dáta"
            description="Najprv potrebuješ leady, scoring a pipeline dáta."
          />
        </div>
      ) : (
        <>
          <section className="mt-6">
            <PipelineForecastPanel rows={data.topForecastLeads} />
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
    </ModuleShell>
  );
}
