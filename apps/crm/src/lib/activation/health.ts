import type { ActivationState, AgencyActivationSnapshot } from "./types";

const MS_72H = 72 * 60 * 60 * 1000;

export function daysSince(iso: string, now = Date.now()): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((now - t) / (24 * 60 * 60 * 1000));
}

export function isActivated(snapshot: AgencyActivationSnapshot): boolean {
  return snapshot.hasImport && snapshot.scoredLeadCount > 0 && snapshot.morningReportEnabled;
}

export function hasRecentLogin(snapshot: AgencyActivationSnapshot, now = Date.now()): boolean {
  if (!snapshot.lastLoginAt) return false;
  const t = new Date(snapshot.lastLoginAt).getTime();
  if (Number.isNaN(t)) return false;
  return now - t < MS_72H;
}

/** S0–S4 per prompt — vetvenie e-mailov. */
export function classifyActivationState(
  snapshot: AgencyActivationSnapshot,
  now = Date.now(),
): ActivationState {
  if (isActivated(snapshot)) return "S3";

  const stale =
    snapshot.daysSinceSignup >= 5 &&
    (!snapshot.hasImport || snapshot.scoredLeadCount === 0) &&
    !hasRecentLogin(snapshot, now);

  if (stale) return "S4";
  if (!snapshot.hasImport) return "S0";
  if (snapshot.scoredLeadCount === 0) return "S1";
  if (!snapshot.morningReportEnabled) return "S2";
  return "S3";
}
