import ModuleShell from "@/components/shared/module-shell";
import ErrorState from "@/components/shared/error-state";
import ManagementKpis from "@/components/management/management-kpis";
import AgentPerformanceTable from "@/components/management/agent-performance-table";
import PipelineOverview from "@/components/management/pipeline-overview";
import TasksOverview from "@/components/management/tasks-overview";
import RecommendationsOverview from "@/components/management/recommendations-overview";
import TopLeadsTable from "@/components/management/top-leads-table";
import TopMatchesTable from "@/components/management/top-matches-table";
import { getManagementDashboardData } from "@/lib/management-store";
import { requireUser } from "@/lib/auth";
import { safeServerAction } from "@/lib/safe-action";

export default async function ManagementPage() {
  await requireUser();

  const result = await safeServerAction(
    () => getManagementDashboardData(),
    "Nepodarilo sa načítať management dashboard."
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="Management dashboard"
        description="Riadiaci panel pre ownera a managera."
      >
        <ErrorState
          title="Management dashboard sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const data = result.data;

  const cards = [
    {
      title: "Všetky príležitosti",
      value: data.kpis.totalLeads,
      subtitle: "Celkový počet príležitostí v CRM",
    },
    {
      title: "Horúce príležitosti",
      value: data.kpis.hotLeads,
      subtitle: "Najvyššia obchodná priorita",
    },
    {
      title: "Otvorené úlohy",
      value: data.kpis.openTasks,
      subtitle: "Denná operatíva tímu",
    },
    {
      title: "AI high priority",
      value: data.kpis.highRecommendations,
      subtitle: "Kritické odporúčania systému",
    },
    {
      title: "Obhliadky",
      value: data.kpis.showingLeads,
      subtitle: "Príležitosti v stave obhliadka",
    },
    {
      title: "Ponuky",
      value: data.kpis.offerLeads,
      subtitle: "Príležitosti vo finálnej fáze",
    },
    {
      title: "Priemerné score",
      value: data.kpis.avgLeadScore,
      subtitle: "Priemerná kvalita príležitostí",
    },
    {
      title: "Silné matching zhody",
      value: data.kpis.strongMatches,
      subtitle: "Zhody so score 80+",
    },
  ];

  return (
    <ModuleShell
      title="Management dashboard"
      description="Riadiaci panel pre ownera a managera: výkon tímu, stav klientov, úlohy, matching a AI."
    >
      <ManagementKpis cards={cards} />

      <section className="mt-6">
        <PipelineOverview rows={data.pipeline} />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AgentPerformanceTable rows={data.agentPerformance} />
        </div>

        <div>
          <TasksOverview
            openTasks={data.kpis.openTasks}
            inProgressTasks={data.kpis.inProgressTasks}
            doneTasks={data.kpis.doneTasks}
            highPriorityTasks={data.kpis.highPriorityTasks}
          />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TopLeadsTable rows={data.topLeads} />
        <TopMatchesTable rows={data.topMatches} />
      </section>

      <section className="mt-6">
        <RecommendationsOverview rows={data.recommendationFeed} />
      </section>
    </ModuleShell>
  );
}
