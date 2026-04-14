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
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Aktivity</h1>
        <p className="mt-1 text-gray-500">
          Centrálna timeline všetkých zmien v systéme.
        </p>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Všetky aktivity</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{total}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">CRM</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{crmCount}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Stav klientov</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{pipelineCount}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Inventory</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{inventoryCount}</h2>
        </div>
      </section>

      <ActivityFeed rows={rows} canSeeEntityMeta={canSeeEntityMeta} />
    </main>
  );
}
