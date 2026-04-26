import ModuleShell from "@/components/shared/module-shell";

export default function IntegrityMonitorPage() {
  return (
    <ModuleShell
      title="Agent Integrity Monitor"
      description="Sledovanie integrity udalostí, rizikových signálov a upozornení pre tím."
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Integrity Monitor je pripravený</h2>
        <p className="mt-2 text-sm text-gray-600">
          Táto sekcia je nová vstupná stránka pre reputačný modul v kapitole Hodnota Značky.
        </p>
      </div>
    </ModuleShell>
  );
}
