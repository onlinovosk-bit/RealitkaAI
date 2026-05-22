import ErrorState from "@/components/shared/error-state";
import LockedFeatureCard from "@/components/shared/locked-feature-card";
import ModuleShell from "@/components/shared/module-shell";
import ForecastPageClient from "@/components/forecasting/ForecastPageClient";
import { safeServerAction } from "@/lib/safe-action";
import { getForecastingData } from "@/lib/forecasting-store";
import { requireRole } from "@/lib/permissions";
import { FEATURE_PERMISSIONS } from "@/lib/role-config";
import { getFeatureGateState } from "@/lib/feature-gating";
import { getCurrentProfile } from "@/lib/auth";

function resolveAccountTier(profile: {
  account_tier?: string | null;
  ui_role?: string | null;
  role?: string | null;
} | null): string {
  const uiRole = profile?.ui_role ?? "agent";
  if (uiRole === "owner_protocol" || profile?.role === "founder") {
    return "protocol_authority";
  }
  return profile?.account_tier ?? "free";
}

export default async function ForecastingPage() {
  await requireRole(FEATURE_PERMISSIONS.FORECASTING);

  const gate = await getFeatureGateState("forecasting");

  if (!gate.enabled) {
    return (
      <ModuleShell
        title="Forecasting & Benchmarky"
        description="Predikcia stavu klientov, benchmark zdrojov príležitostí, výkonu agentov a stavov príležitostí."
      >
        <LockedFeatureCard
          title="Forecasting je zamknutý"
          description={gate.reason || "Táto funkcia nie je dostupná pre aktuálny plán."}
        />
      </ModuleShell>
    );
  }

  const [result, profile] = await Promise.all([
    safeServerAction(
      () => getForecastingData(),
      "Nepodarilo sa načítať forecasting a benchmarky."
    ),
    getCurrentProfile(),
  ]);

  if (!result.ok) {
    return (
      <ModuleShell
        title="Forecasting & Benchmarky"
        description="Predikcia stavu klientov, benchmark zdrojov príležitostí, výkonu agentov a stavov príležitostí."
      >
        <ErrorState
          title="Forecasting sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const accountTier = resolveAccountTier(
    profile as { account_tier?: string | null; ui_role?: string | null; role?: string | null } | null
  );

  return <ForecastPageClient accountTier={accountTier} data={result.data} />;
}
