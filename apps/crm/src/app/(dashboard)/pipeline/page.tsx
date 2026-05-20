import PipelineBoard from "@/components/pipeline/pipeline-board";
import ModuleShell from "@/components/shared/module-shell";
import { listLeads } from "@/lib/leads-store";

function StatCard({
  title,
  value,
  subtitle,
  valueClass,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <h2 className={`mt-1 text-2xl font-bold tabular-nums md:text-3xl ${valueClass}`}>{value}</h2>
      <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
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
    <ModuleShell
      title="Fázy príležitostí"
      description="Kartový prehľad s AI odporúčaniami, bočným detailom a históriou presunov."
    >
      <section className="mb-6 grid grid-cols-2 gap-2 md:gap-4 xl:grid-cols-5">
        <StatCard
          title="Nové"
          value={newCount}
          subtitle="Komu volať ako prvému?"
          valueClass="text-blue-700"
        />
        <StatCard
          title="Teplé"
          value={warmCount}
          subtitle="Vyžadujú follow-up"
          valueClass="text-amber-600"
        />
        <StatCard
          title="Horúce"
          value={hotCount}
          subtitle="Najvyššia priorita"
          valueClass="text-red-600"
        />
        <StatCard
          title="Obhliadky"
          value={showingCount}
          subtitle="Najbližší krok k provízii"
          valueClass="text-emerald-700"
        />
        <StatCard
          title="Ponuky"
          value={offerCount}
          subtitle="Kedy inkasujem províziu?"
          valueClass="text-orange-600"
        />
      </section>

      <PipelineBoard initialLeads={leads} />
    </ModuleShell>
  );
}
