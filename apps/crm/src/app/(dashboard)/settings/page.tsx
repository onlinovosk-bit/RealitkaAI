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

export default async function SettingsPage() {
  await requireRole(["owner", "manager", "agent"]);

  const result = await safeServerAction(
    () => getSaasOpsSnapshot(),
    "Nepodarilo sa načítať admin settings."
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="Admin settings + SaaS ops"
        description="Správa plánu, feature flags, limitov a trial/grace logiky."
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
      title="Admin settings + SaaS ops"
      description="Správa plánu, feature flags, limitov a trial/grace logiky."
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
