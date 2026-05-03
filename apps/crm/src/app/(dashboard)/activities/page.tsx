import ActivityFeed from "@/components/activities/activity-feed";
import { listActivities } from "@/lib/activities-store";
import { getCurrentProfile } from "@/lib/auth";

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
    <main className="p-6" style={{ background: "#050914", minHeight: "100vh" }}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: "#F0F9FF" }}>Aktivity</h1>
        <p className="mt-1" style={{ color: "#64748B" }}>
          Centrálna timeline všetkých zmien v systéme.
        </p>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          className="rounded-2xl border p-5"
          style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
        >
          <p className="text-sm" style={{ color: "#64748B" }}>Všetky aktivity</p>
          <h2 className="mt-2 text-3xl font-bold" style={{ color: "#F0F9FF" }}>{total}</h2>
        </div>

        <div
          className="rounded-2xl border p-5"
          style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
        >
          <p className="text-sm" style={{ color: "#64748B" }}>CRM</p>
          <h2 className="mt-2 text-3xl font-bold" style={{ color: "#F0F9FF" }}>{crmCount}</h2>
        </div>

        <div
          className="rounded-2xl border p-5"
          style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
        >
          <p className="text-sm" style={{ color: "#64748B" }}>Stav klientov</p>
          <h2 className="mt-2 text-3xl font-bold" style={{ color: "#F0F9FF" }}>{pipelineCount}</h2>
        </div>

        <div
          className="rounded-2xl border p-5"
          style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
        >
          <p className="text-sm" style={{ color: "#64748B" }}>Inventory</p>
          <h2 className="mt-2 text-3xl font-bold" style={{ color: "#F0F9FF" }}>{inventoryCount}</h2>
        </div>
      </section>

      <ActivityFeed rows={rows} canSeeEntityMeta={canSeeEntityMeta} />
    </main>
  );
}
