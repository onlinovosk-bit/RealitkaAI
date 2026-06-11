export type ActivationFeatureFlags = {
  onboardingWizardEnabled: boolean;
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
 * Activation flows are OFF by default in every environment.
 * Enable explicitly when ready:
 *   ONBOARDING_WIZARD_ENABLED=true
 */
function resolveActivationFlag(envKey: string): boolean {
  return isExplicitTrue(process.env[envKey]);
}

export function getActivationFeatureFlags(): ActivationFeatureFlags {
  return {
    onboardingWizardEnabled: resolveActivationFlag("ONBOARDING_WIZARD_ENABLED"),
  };
}
