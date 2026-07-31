export const GUARDIAN_FINDINGS_TABLE = "guardian_findings" as const;

/** v1.1 STALE: activity in last 90d but none in last 7d (requires lead_events). */
export const GUARDIAN_THRESHOLDS = {
  R1_STALE_ACTIVITY_WINDOW_DAYS: 90,
  R1_STALE_QUIET_DAYS: 7,
  R2_NO_OWNER_HOURS: 24,
  /** v1.2 NO_PHONE: grace after creation before flagging (mirror NO_OWNER). */
  R3_NO_PHONE_GRACE_HOURS: 24,
  /** v1.2 NO_PHONE: only flag when last lead_event is within this window (mirror STALE cap). */
  R3_NO_PHONE_ACTIVITY_WINDOW_DAYS: 90,
  R4_HOT_IGNORED_HOURS: 48,
} as const;

export const GUARDIAN_BATCH_LEAD_LIMIT = 500;

export const GUARDIAN_BASELINE_FINDING_KILL = 50;

export const GUARDIAN_DIGEST_THROTTLE_HOURS = 24;

export const GUARDIAN_RUNNER_NOTIFICATION_TYPE = "guardian_runner" as const;

export function isGuardianDigestEnabled(): boolean {
  const raw = process.env.GUARDIAN_DIGEST_ENABLED;
  if (raw === undefined || raw === "") return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on";
}

export function isGuardianRunnerEnabled(): boolean {
  const raw = process.env.GUARDIAN_RUNNER_ENABLED;
  if (raw === undefined || raw === "") return true;
  const normalized = raw.trim().toLowerCase();
  return normalized !== "false" && normalized !== "0" && normalized !== "off";
}

/** Comma-separated agency UUIDs. `undefined` = not configured; `""` = explicitly empty. */
export function parseGuardianAgencyAllowlist(): string[] | null {
  const raw = process.env.GUARDIAN_AGENCY_ALLOWLIST;
  if (raw === undefined) return null;
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isGuardianProductionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview")
  );
}

export type GuardianAgencyFilterResult = {
  ids: string[];
  skippedReason?: "allowlist_empty" | "allowlist_unset_prod";
};

/**
 * Production: run only allowlisted agencies when GUARDIAN_AGENCY_ALLOWLIST is set;
 * when unset or empty on production, run none (founder must set env after ID confirm).
 * Non-production: all active agencies (tests/dev).
 */
export function filterAgenciesForGuardianRun(allAgencyIds: string[]): GuardianAgencyFilterResult {
  const allowlist = parseGuardianAgencyAllowlist();
  if (allowlist !== null) {
    if (allowlist.length === 0) {
      console.warn("[guardian] GUARDIAN_AGENCY_ALLOWLIST is empty — skipping all agencies");
      return { ids: [], skippedReason: "allowlist_empty" };
    }
    const allowed = new Set(allowlist);
    return { ids: allAgencyIds.filter((id) => allowed.has(id)) };
  }
  if (isGuardianProductionRuntime()) {
    console.warn(
      "[guardian] GUARDIAN_AGENCY_ALLOWLIST unset on production — skipping tenant runs until founder sets allowlist",
    );
    return { ids: [], skippedReason: "allowlist_unset_prod" };
  }
  return { ids: allAgencyIds };
}
