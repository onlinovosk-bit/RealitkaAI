export type DecisionFeatureFlags = {
  decisionEngineEnabled: boolean;
  closingWindowEnabled: boolean;
  rescueAutomationEnabled: boolean;
};

function asBool(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isExplicitTrue(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  return asBool(value);
}

/**
 * Decision ops are OFF by default in every environment (local, preview, production).
 * Enable explicitly in Vercel Production when ready:
 *   DECISION_ENGINE_ENABLED=true
 *   CLOSING_WINDOW_ENABLED=true
 *   RESCUE_AUTOMATION_ENABLED=true
 */
function resolveDecisionFlag(envKey: string): boolean {
  return isExplicitTrue(process.env[envKey]);
}

export function getDecisionFeatureFlags(): DecisionFeatureFlags {
  return {
    decisionEngineEnabled: resolveDecisionFlag("DECISION_ENGINE_ENABLED"),
    closingWindowEnabled: resolveDecisionFlag("CLOSING_WINDOW_ENABLED"),
    rescueAutomationEnabled: resolveDecisionFlag("RESCUE_AUTOMATION_ENABLED"),
  };
}
