export type DecisionFeatureFlags = {
  decisionEngineEnabled: boolean;
  closingWindowEnabled: boolean;
  rescueAutomationEnabled: boolean;
};

function asBool(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function getDecisionFeatureFlags(): DecisionFeatureFlags {
  return {
    decisionEngineEnabled: asBool(process.env.DECISION_ENGINE_ENABLED),
    closingWindowEnabled: asBool(process.env.CLOSING_WINDOW_ENABLED),
    rescueAutomationEnabled: asBool(process.env.RESCUE_AUTOMATION_ENABLED),
  };
}
