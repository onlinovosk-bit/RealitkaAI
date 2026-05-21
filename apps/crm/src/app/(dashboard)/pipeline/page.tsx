import PipelineBoard from "@/components/pipeline/pipeline-board";
import { PipelineActionStrip } from "@/components/pipeline/PipelineActionStrip";
import { listLeads } from "@/lib/leads-store";
import { SLATE_HORIZON, WORKDESK_KPI } from "@/lib/slate-horizon-theme";

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
    <div
      className="rounded-2xl border p-5"
      style={{
        background: WORKDESK_KPI.background,
        borderColor: WORKDESK_KPI.borderColor,
        boxShadow: WORKDESK_KPI.boxShadow,
        borderRadius: WORKDESK_KPI.borderRadius,
      }}
    >
      <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>{title}</p>
      <h2 className="mt-2 text-3xl font-bold" style={{ color: SLATE_HORIZON.ink }}>{value}</h2>
      <p className="mt-2 text-sm" style={{ color: SLATE_HORIZON.muted }}>{subtitle}</p>
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
    <main className="min-h-screen p-6" style={{ background: SLATE_HORIZON.bg }}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: SLATE_HORIZON.ink }}>Fázy príležitostí</h1>
        <p className="mt-1" style={{ color: SLATE_HORIZON.muted }}>
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

      <PipelineActionStrip leads={leads} />

      <PipelineBoard initialLeads={leads} />
    </main>
  );
}
