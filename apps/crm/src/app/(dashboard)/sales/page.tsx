
import ModuleShell from "@/components/shared/module-shell";

export default function SalesPage() {
  return (
    <ModuleShell
      title="Sales"
      description="Prehľad a analýza predajných dát. Pridaj sem vlastný obsah podľa potreby."
    >
      <div className="p-6">
        <h2 className="text-xl font-bold mb-2">Sales sekcia</h2>
        <p className="text-gray-700">Táto sekcia je pripravená na vlastný obsah pre sales reporting alebo analýzu.</p>
      </div>
    </ModuleShell>
  );
}
