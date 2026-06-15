export type ActivationFeatureFlags = {
  onboardingWizardEnabled: boolean;
  onboardingEmailsEnabled: boolean;
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
 *   ONBOARDING_EMAILS_ENABLED=true
 */
function resolveActivationFlag(envKey: string): boolean {
  return isExplicitTrue(process.env[envKey]);
}

export function getActivationFeatureFlags(): ActivationFeatureFlags {
  return {
    onboardingWizardEnabled: resolveActivationFlag("ONBOARDING_WIZARD_ENABLED"),
    onboardingEmailsEnabled: resolveActivationFlag("ONBOARDING_EMAILS_ENABLED"),
  };
}

/** @deprecated Use getActivationFeatureFlags().onboardingEmailsEnabled */
export function isOnboardingEmailsEnabled(): boolean {
  return getActivationFeatureFlags().onboardingEmailsEnabled;
}

export function getActivationFromEmail(): string {
  return process.env.ONBOARDING_FROM_EMAIL?.trim() || "Andy z Revolisu <andy@revolis.ai>";
}

export function getActivationReplyTo(): string {
  return process.env.ONBOARDING_REPLY_TO?.trim() || "andy@revolis.ai";
}

export function getFounderInboxEmails(): string[] {
  const raw = process.env.FOUNDER_EMAILS?.trim() || process.env.FOUNDER_EMAIL?.trim() || "";
  return raw
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean);
}

export function getAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://app.revolis.ai").replace(/\/$/, "");
}
