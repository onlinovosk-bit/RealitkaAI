import ActivityFeed from "@/components/activities/activity-feed";
import { listActivities } from "@/lib/activities-store";
import { getCurrentProfile } from "@/lib/auth";
import { SLATE_HORIZON, WORKDESK_KPI } from "@/lib/slate-horizon-theme";

function StatCard({ title, value }: { title: string; value: number }) {
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
    </div>
  );
}

export default async function ActivitiesPage() {
  const [rows, profile] = await Promise.all([
    listActivities(300),
    getCurrentProfile(),
  ]);

  const role = String((profile as { role?: string } | null)?.role ?? "agent").toLowerCase();
  const canSeeEntityMeta = role === "owner" || role === "admin";

  const total = rows.length;
  const crmCount = rows.filter((item) => item.source === "crm").length;
  const pipelineCount = rows.filter((item) => item.source === "pipeline").length;
  const inventoryCount = rows.filter((item) => item.source === "inventory").length;

  return (
    <main className="min-h-screen p-6" style={{ background: SLATE_HORIZON.bg }}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: SLATE_HORIZON.ink }}>Aktivity</h1>
        <p className="mt-1" style={{ color: SLATE_HORIZON.muted }}>
          Centrálna timeline všetkých zmien v systéme.
        </p>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Všetky aktivity" value={total} />
        <StatCard title="CRM" value={crmCount} />
        <StatCard title="Stav klientov" value={pipelineCount} />
        <StatCard title="Inventory" value={inventoryCount} />
      </section>

      <ActivityFeed rows={rows} canSeeEntityMeta={canSeeEntityMeta} />
    </main>
  );
}
