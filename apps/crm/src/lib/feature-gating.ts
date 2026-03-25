import { getSaasOpsSnapshot } from "@/lib/saas-ops";

export type GateFeatureKey =
  | "aiScoring"
  | "aiRecommendations"
  | "matching"
  | "forecasting"
  | "communicationHub"
  | "outreach"
  | "integrations"
  | "teamManagement"
  | "advancedReporting"
  | "billing";

export type GateLimitKey =
  | "maxAgents"
  | "maxLeads"
  | "maxProperties"
  | "maxTeams"
  | "monthlyInboxSyncMessages"
  | "monthlyPortalImports"
  | "activeAutomationFlows";

export async function getGateSnapshot() {
  return getSaasOpsSnapshot();
}

export async function requireActiveAppAccess() {
  const snapshot = await getGateSnapshot();

  if (!snapshot.canUseFullApp) {
    throw new Error(snapshot.trialGrace.message || "Prístup k aplikácii je obmedzený.");
  }

  return snapshot;
}

export async function requireFeature(feature: GateFeatureKey) {
  const snapshot = await requireActiveAppAccess();

  if (!snapshot.flags[feature]) {
    throw new Error(`Funkcia "${feature}" nie je dostupná pre aktuálny plán.`);
  }

  return snapshot;
}

export async function requireLimitAvailable(
  limitKey: GateLimitKey,
  currentValueOverride?: number
) {
  const snapshot = await requireActiveAppAccess();

  const currentUsageMap: Record<GateLimitKey, number> = {
    maxAgents: snapshot.usage.agents,
    maxLeads: snapshot.usage.leads,
    maxProperties: snapshot.usage.properties,
    maxTeams: snapshot.usage.teams,
    monthlyInboxSyncMessages: 0,
    monthlyPortalImports: 0,
    activeAutomationFlows: 0,
  };

  const currentValue =
    typeof currentValueOverride === "number"
      ? currentValueOverride
      : currentUsageMap[limitKey];

  const limit = snapshot.limits[limitKey];

  if (currentValue >= limit) {
    throw new Error(`Dosiahol si limit pre ${limitKey}. Aktuálny plán už túto akciu nepovoľuje.`);
  }

  return snapshot;
}

export async function getFeatureGateState(feature: GateFeatureKey) {
  const snapshot = await getGateSnapshot();

  return {
    enabled: Boolean(snapshot.canUseFullApp && snapshot.flags[feature]),
    plan: snapshot.plan,
    trialGrace: snapshot.trialGrace,
    reason: snapshot.canUseFullApp
      ? snapshot.flags[feature]
        ? null
        : `Funkcia nie je dostupná pre plán ${snapshot.plan}.`
      : snapshot.trialGrace.message,
  };
}

export async function getLimitGateState(limitKey: GateLimitKey) {
  const snapshot = await getGateSnapshot();

  const valueMap: Record<GateLimitKey, number> = {
    maxAgents: snapshot.usage.agents,
    maxLeads: snapshot.usage.leads,
    maxProperties: snapshot.usage.properties,
    maxTeams: snapshot.usage.teams,
    monthlyInboxSyncMessages: 0,
    monthlyPortalImports: 0,
    activeAutomationFlows: 0,
  };

  const current = valueMap[limitKey];
  const limit = snapshot.limits[limitKey];

  return {
    current,
    limit,
    blocked: current >= limit,
    reason:
      current >= limit
        ? `Limit ${limitKey} bol dosiahnutý (${current}/${limit}).`
        : null,
  };
}
