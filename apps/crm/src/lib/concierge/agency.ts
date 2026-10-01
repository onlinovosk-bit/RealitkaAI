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

/**
 * Fail-closed shared secret for Voiceflow → Revolis.
 *
 * This used to return true when CONCIERGE_SHARED_SECRET was unset ("empty =
 * open + rate limit only"). Measured 2026-09-27: no such variable was set in
 * production, so all three routes `proxy.ts` places outside the session gate —
 * properties, callback, freebusy — accepted anonymous callers, and callback
 * writes into `leads`. A missing env var is a misconfiguration, and a
 * misconfiguration must not read as permission.
 *
 * The repo had already settled this question once, for cron: see
 * `isAuthorizedCronBearer`, which refuses when CRON_SECRET is unset, and its
 * test. Concierge had the same shape and the opposite answer; this removes the
 * disagreement rather than introducing a new rule.
 *
 * Shipping this ahead of the env var is deliberate and measured, not an
 * oversight: `usage_metrics_daily` holds 54 rows across 6 metrics with writes
 * as recent as today, and zero rows for any `concierge_*` metric — so these
 * routes have never been called in production and there is nothing to break.
 * Wiring the widget now requires the secret, which is the right dependency
 * direction.
 */
export function conciergeSecretOk(
  headerValue: string | null,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const expected = env.CONCIERGE_SHARED_SECRET?.trim();
  if (!expected) return false;
  return Boolean(headerValue && headerValue === expected);
}
