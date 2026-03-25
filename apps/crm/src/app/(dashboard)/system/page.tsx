import SystemHealthCards from "@/components/system/system-health-cards";
import EmptyState from "@/components/shared/empty-state";
import { getEnvironmentHealth } from "@/lib/app-env";

export default async function SystemPage() {
  const health = getEnvironmentHealth();

  const totalChecks = health.checks.length;
  const okChecks = health.checks.filter((item) => item.present).length;
  const missingRequired = health.checks.filter(
    (item) => item.required && !item.present
  ).length;
  const optionalMissing = health.checks.filter(
    (item) => !item.required && !item.present
  ).length;

  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Systém / Stabilizácia</h1>
        <p className="mt-1 text-gray-500">
          Diagnostika prostredia a stabilizačná vrstva projektu.
        </p>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Počet kontrol</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{totalChecks}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Úspešné kontroly</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{okChecks}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Chýbajúce povinné</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{missingRequired}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Chýbajúce voliteľné</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{optionalMissing}</h2>
        </div>
      </section>

      {health.checks.length > 0 ? (
        <SystemHealthCards checks={health.checks} mode={health.mode} />
      ) : (
        <EmptyState
          title="Diagnostika nie je dostupná"
          description="Nie sú pripravené žiadne systémové kontroly."
        />
      )}
    </main>
  );
}
