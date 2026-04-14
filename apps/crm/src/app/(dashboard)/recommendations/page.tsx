import ModuleShell from "@/components/shared/module-shell";
import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import RecalculateRecommendationsPanel from "@/components/recommendations/recalculate-recommendations-panel";
import RecommendationsTable from "@/components/recommendations/recommendations-table";
import RecommendationsFeed from "@/components/recommendations/recommendations-feed";
import { listRecommendations } from "@/lib/recommendations-store";
import { listLeads } from "@/lib/leads-store";
import { listProperties } from "@/lib/properties-store";
import { safeServerAction } from "@/lib/safe-action";

export default async function RecommendationsPage() {
  const result = await safeServerAction(
    async () => {
      const [recommendations, leads, properties] = await Promise.all([
        listRecommendations(),
        listLeads(),
        listProperties(),
      ]);

      return { recommendations, leads, properties };
    },
    "Nepodarilo sa načítať AI odporúčania."
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="AI odporúčania"
        description="Persistované AI odporúčania zapisované do databázy."
      >
        <ErrorState
          title="AI odporúčania sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const { recommendations, leads, properties } = result.data;

  const rows = recommendations.map((item) => {
    const lead = leads.find((l) => l.id === item.leadId);
    const property = properties.find((p) => p.id === item.propertyId);

    return {
      id: item.id,
      leadId: item.leadId,
      propertyId: item.propertyId,
      recommendationType: item.recommendationType,
      title: item.title,
      description: item.description,
      priority: item.priority,
      status: item.status,
      modelVersion: item.modelVersion,
      leadName: lead?.name ?? item.leadId ?? "-",
      propertyTitle: property?.title ?? "",
    };
  });

  const total = rows.length;
  const high = rows.filter((item) => item.priority === "high").length;
  const medium = rows.filter((item) => item.priority === "medium").length;
  const uniqueLeads = new Set(rows.map((item) => item.leadId).filter(Boolean)).size;

  return (
    <ModuleShell
      title="AI odporúčania"
      description="Persistované AI odporúčania zapisované do databázy."
    >
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Všetky odporúčania</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{total}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">High priority</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{high}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Medium priority</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{medium}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Príležitosti s odporúčaním</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{uniqueLeads}</h2>
        </div>
      </section>

      <section className="mb-6">
        <RecalculateRecommendationsPanel />
      </section>

      {rows.length === 0 ? (
        <EmptyState
          title="Zatiaľ nie sú uložené žiadne AI odporúčania"
          description="Klikni na „Prepočítať odporúčania“ a systém ich zapíše do databázy."
        />
      ) : (
        <>
          <section className="mb-6">
            <RecommendationsFeed rows={rows.slice(0, 8)} />
          </section>

          <RecommendationsTable rows={rows} />
        </>
      )}
    </ModuleShell>
  );
}
