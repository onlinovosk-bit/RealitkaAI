export const GUARDIAN_FINDINGS_TABLE = "guardian_findings" as const;

/** v1 thresholds — code constants; change without migration (brief R1–R4). */
export const GUARDIAN_THRESHOLDS = {
  R1_STALE_DAYS: 7,
  R2_NO_OWNER_HOURS: 24,
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
