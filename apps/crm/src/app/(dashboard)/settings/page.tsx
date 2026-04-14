import ModuleShell from "@/components/shared/module-shell";
import ErrorState from "@/components/shared/error-state";
import PlanStatusCard from "@/components/settings/plan-status-card";
import PlanSelectorCard from "@/components/settings/plan-selector-card";
import FeatureFlagsCard from "@/components/settings/feature-flags-card";
import UsageLimitsCard from "@/components/settings/usage-limits-card";
import TrialGraceCard from "@/components/settings/trial-grace-card";
import { getSaasOpsSnapshot } from "@/lib/saas-ops";
import { safeServerAction } from "@/lib/safe-action";
import { requireRole } from "@/lib/permissions";
import GoogleConnectButton from "@/components/integrations/GoogleConnectButton";
import GoogleCalendarDemo from "@/components/integrations/GoogleCalendarDemo";
import UsageMetricsEnterpriseCard from "@/components/settings/usage-metrics-enterprise-card";
import Link from "next/link";

export default async function SettingsPage() {
  await requireRole(["owner", "manager", "agent"]);

  const result = await safeServerAction(
    () => getSaasOpsSnapshot(),
    "Nepodarilo sa načítať admin settings."
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="Nastavenia a SaaS prevádzka"
        description="Správa plánu, funkčných prepínačov, limitov a logiky skúšobného obdobia/odkladnej lehoty."
      >
        <ErrorState
          title="Admin settings sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const data = result.data;

  // Vypíš do konzoly všetky vypnuté features podľa snapshotu
  if (typeof window !== "undefined" && data?.flags) {
    const disabled = Object.entries(data.flags)
      .filter(([_, v]) => !v)
      .map(([k]) => k);
    if (disabled.length > 0) {
      console.log("Vypnuté features:", disabled);
    } else {
      console.log("Všetky features sú zapnuté");
    }
  }

  return (
    <ModuleShell
      title="Nastavenia a SaaS prevádzka"
      description="Správa plánu, funkčných prepínačov, limitov a logiky skúšobného obdobia/odkladnej lehoty."
    >
      <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PlanStatusCard
          plan={data.plan}
          billingStatus={data.billing.subscription?.status || "no_subscription"}
          canUseFullApp={data.canUseFullApp}
        />
        <PlanSelectorCard plan={data.plan} />
      </section>

      <section className="mb-6">
        <TrialGraceCard trialGrace={data.trialGrace} />
      </section>

      <section className="mb-6">
        <UsageLimitsCard
          usage={data.usage}
          limits={data.limits}
          usageHealth={data.usageHealth}
        />
      </section>

      <section className="mb-6">
        <UsageMetricsEnterpriseCard />
      </section>

      <section className="mb-6">
        <Link
          href="/settings/nexus-ai-chat"
          className="block rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-100/60"
        >
          <h2 className="text-base font-semibold text-indigo-900">NEXUS AI Chat</h2>
          <p className="mt-1 text-sm text-indigo-800">
            Nastav štýl odpovedí, dĺžku výstupov a formát email návrhov.
          </p>
          <span className="mt-2 inline-block text-sm font-medium text-indigo-700">Otvoriť nastavenia →</span>
        </Link>
      </section>

      <FeatureFlagsCard flags={data.flags} />

      {/* Integrácie Google - demo */}
      <div className="mt-10">
        <h2 className="text-lg font-bold mb-2">Integrácia Google (demo)</h2>
        <GoogleConnectButton />
        <GoogleCalendarDemo />
      </div>
    </ModuleShell>
  );
}
