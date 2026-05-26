export type DecisionFeatureFlags = {
  decisionEngineEnabled: boolean;
  closingWindowEnabled: boolean;
  rescueAutomationEnabled: boolean;
};

function asBool(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isExplicitFalse(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off";
}

function isExplicitTrue(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  return asBool(value);
}

/**
 * Vercel prod/preview: decision ops ON unless env explicitly `false` (kill-switch).
 * Local dev: OFF unless env explicitly `true`.
 */
function resolveDecisionFlag(envKey: string): boolean {
  const raw = process.env[envKey];
  if (isExplicitFalse(raw)) return false;
  if (isExplicitTrue(raw)) return true;

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production" || vercelEnv === "preview") {
    return true;
  }
  return false;
}

export function getDecisionFeatureFlags(): DecisionFeatureFlags {
  return {
    decisionEngineEnabled: resolveDecisionFlag("DECISION_ENGINE_ENABLED"),
    closingWindowEnabled: resolveDecisionFlag("CLOSING_WINDOW_ENABLED"),
    rescueAutomationEnabled: resolveDecisionFlag("RESCUE_AUTOMATION_ENABLED"),
  };
}
