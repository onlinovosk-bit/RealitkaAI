/** Default OFF — zapni v Vercel: ONBOARDING_EMAILS_ENABLED=true */
export function isOnboardingEmailsEnabled(): boolean {
  const v = process.env.ONBOARDING_EMAILS_ENABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
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
