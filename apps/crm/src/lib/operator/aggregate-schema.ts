/** Allowed keys on operator aggregate rows — no PII (names/emails/phones of leads). */
export const OPERATOR_AGENCY_AGGREGATE_KEYS = [
  "agencyId",
  "agencyName",
  "status",
  "excludedFromScoring",
  "contacts7d",
  "contactsTotal",
  "trend14d",
  "reaction24hPct",
  "reaction24hStatus",
  "noReactionCount",
  "dealsWon",
  "dealsLost",
  "openGuardianFindings",
  "healthScore",
] as const;

export type OperatorAgencyAggregateKey = (typeof OPERATOR_AGENCY_AGGREGATE_KEYS)[number];

export const OPERATOR_FORBIDDEN_AGGREGATE_KEYS = [
  "email",
  "phone",
  "full_name",
  "name",
  "invitee_email",
  "invitee_name",
  "lead_id",
  "profile_id",
] as const;

export function assertOperatorAggregateNoPii(row: Record<string, unknown>): void {
  for (const key of OPERATOR_FORBIDDEN_AGGREGATE_KEYS) {
    if (key in row) {
      throw new Error(`operator aggregate leak: forbidden column "${key}"`);
    }
  }
}
