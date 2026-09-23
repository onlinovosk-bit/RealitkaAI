import { SMOLKO_AGENCY_ID } from "@/lib/profiles/resolve-profile-for-auth";

/** Tenant for Website Concierge (Reality Smolko). Override via env in non-prod. */
export function resolveConciergeAgencyId(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return (
    env.CONCIERGE_AGENCY_ID?.trim() ||
    env.LEAD_FORM_AGENCY_ID_SMOLKO?.trim() ||
    SMOLKO_AGENCY_ID
  );
}

/** Optional shared secret for Voiceflow → Revolis. Empty = open + rate limit only. */
export function conciergeSecretOk(
  headerValue: string | null,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const expected = env.CONCIERGE_SHARED_SECRET?.trim();
  if (!expected) return true;
  return Boolean(headerValue && headerValue === expected);
}
