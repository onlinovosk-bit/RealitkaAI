import PipelineBoard from "@/components/pipeline/pipeline-board";
import { listLeads } from "@/lib/leads-store";

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className="mt-2 text-3xl font-bold text-gray-900">{value}</h2>
      <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

export default async function PipelinePage() {
  const leads = await listLeads();

  const newCount = leads.filter((lead) => lead.status === "Nový").length;
  const warmCount = leads.filter((lead) => lead.status === "Teplý").length;
  const hotCount = leads.filter((lead) => lead.status === "Horúci").length;
  const showingCount = leads.filter((lead) => lead.status === "Obhliadka").length;
  const offerCount = leads.filter((lead) => lead.status === "Ponuka").length;

  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Fázy príležitostí</h1>
        <p className="mt-1 text-gray-500">
          Kartový prehľad s AI odporúčaniami, bočným detailom a históriou presunov.
        </p>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Nové"
          value={newCount}
          subtitle="Čakajú na prvý kontakt"
        />
        <StatCard
          title="Teplé"
          value={warmCount}
          subtitle="Vyžadujú follow-up"
        />
        <StatCard
          title="Horúce"
          value={hotCount}
          subtitle="Najvyššia priorita"
        />
        <StatCard
          title="Obhliadky"
          value={showingCount}
          subtitle="Naplánované stretnutia"
        />
        <StatCard
          title="Ponuky"
          value={offerCount}
          subtitle="Príležitosť je vo finálnej fáze"
        />
      </section>

      <PipelineBoard initialLeads={leads} />
    </main>
  );
}