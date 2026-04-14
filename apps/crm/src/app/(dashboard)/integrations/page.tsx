import ModuleShell from "@/components/shared/module-shell";
import LockedFeatureCard from "@/components/shared/locked-feature-card";
import FeatureGateBanner from "@/components/shared/feature-gate-banner";
import CalendarSyncPanel from "@/components/integrations/calendar-sync-panel";
import EmailSyncPanel from "@/components/integrations/email-sync-panel";
import PortalImportPanel from "@/components/integrations/portal-import-panel";
import { requireRole } from "@/lib/permissions";
import { getFeatureGateState } from "@/lib/feature-gating";

export default async function IntegrationsPage() {
  await requireRole(["owner", "manager"]);

  const gate = await getFeatureGateState("integrations");

  if (!gate.enabled) {
    return (
      <ModuleShell
        title="Integrations 1.0"
        description="Calendar sync, email inbox sync a import portálových príležitostí."
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
      title="Integrations 1.0"
      description="Calendar sync, email inbox sync a import portálových príležitostí."
    >
      <FeatureGateBanner description="Integrations sú aktivované v tvojom pláne." title="Integrations sú aktívne" />

      <section className="mt-6 mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Moduly integrácií</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">3</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Kalendár</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">ICS</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Inbox</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">IMAP</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Portály</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">CSV</h2>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CalendarSyncPanel />
        <EmailSyncPanel />
      </section>

      <section className="mt-6">
        <PortalImportPanel />
      </section>
    </ModuleShell>
  );
}
