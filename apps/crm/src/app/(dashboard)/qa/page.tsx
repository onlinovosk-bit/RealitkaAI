import ModuleShell from "@/components/shared/module-shell";
import SmokeTestPanel from "@/components/qa/smoke-test-panel";
import QaChecklist from "@/components/qa/qa-checklist";
import { requireUser } from "@/lib/auth";

export default async function QaPage() {
  await requireUser();

  return (
    <ModuleShell
      title="QA / Testovacia fáza"
      description="Kontrola kritických procesov projektu pred ďalším rozvojom."
    >
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Kritické procesy</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">10</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Automatické testy</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">7</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Manuálne bloky</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">6</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Cieľ</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">Stabilita</h2>
        </div>
      </section>

      <section className="mb-6">
        <SmokeTestPanel />
      </section>

      <QaChecklist />
    </ModuleShell>
  );
}
