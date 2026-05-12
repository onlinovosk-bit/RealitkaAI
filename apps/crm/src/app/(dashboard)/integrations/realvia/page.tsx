import Link from "next/link";
import ModuleShell from "@/components/shared/module-shell";
import LockedFeatureCard from "@/components/shared/locked-feature-card";
import FeatureGateBanner from "@/components/shared/feature-gate-banner";
import { requireRole } from "@/lib/permissions";
import { getFeatureGateState } from "@/lib/feature-gating";

export default async function RealviaIntegrationsPage() {
  await requireRole(["owner", "manager"]);

  const gate = await getFeatureGateState("integrations");

  if (!gate.enabled) {
    return (
      <ModuleShell
        title="Realvia"
        description="Kanál pre dáta z Realvie a súvisiace integrácie."
      >
        <LockedFeatureCard
          title="Integrations sú zamknuté"
          description={gate.reason || "Integrations nie sú dostupné pre aktuálny plán."}
        />
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      title="Realvia"
      description="Kanál pre dáta z Realvie. Kanonická adresa v CRM je vždy pod /integrations/realvia."
    >
      <FeatureGateBanner
        description="Integrations sú aktivované v tvojom pláne."
        title="Integrations sú aktívne"
      />

      <section className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Odkazy a kontext</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-600">
          <li>
            Verejná kanonická URL aplikácie:{" "}
            <span className="font-mono text-gray-900">https://app.revolis.ai/integrations/realvia</span>
          </li>
          <li>
            Marketingová doména (www) používaj len ak vieš, že aplikácia beží na subdoméne{" "}
            <span className="font-mono">app</span>.
          </li>
          <li>
            Späť na všetky integrácie:{" "}
            <Link href="/integrations" className="font-medium text-blue-600 underline">
              /integrations
            </Link>
          </li>
        </ul>
        <p className="text-sm text-gray-500">
          Samotné sťahovanie a spracovanie feedu Realvie beží ako samostatná služba (realvia-ingestion), nie v
          tomto Next.js projekte.
        </p>
      </section>
    </ModuleShell>
  );
}
