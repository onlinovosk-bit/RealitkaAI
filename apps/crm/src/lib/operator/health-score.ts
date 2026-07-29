/**
 * Composite agency health score (0–100) for Operator Dashboard F2.
 *
 * Weights (documented for founder review — adjust only with premortem update):
 * - BASE: starting point before penalties/bonuses
 * - OPEN_GUARDIAN_FINDING: per open HOT_IGNORED / NO_OWNER finding (capped)
 * - ONBOARDING_INCOMPLETE: valuation widget not enabled for paying tenant
 * - REACTION24H_LOW / REACTION24H_GOOD: when 24h reaction metric is available
 * - REACTION24H_UNKNOWN: small penalty when metric unavailable (missing lead_events)
 * - WON_30D: bonus per won deal in last 30 days (capped)
 */
export const OPERATOR_HEALTH_WEIGHTS = {
  BASE: 72,
  OPEN_GUARDIAN_FINDING: -12,
  OPEN_GUARDIAN_FINDING_CAP: 36,
  ONBOARDING_INCOMPLETE: -22,
  REACTION24H_LOW: -18,
  REACTION24H_GOOD: 8,
  REACTION24H_LOW_THRESHOLD: 0.5,
  REACTION24H_GOOD_THRESHOLD: 0.8,
  REACTION24H_UNKNOWN: -4,
  WON_30D: 4,
  WON_30D_CAP: 16,
} as const;

export function computeOperatorHealthScore(input: {
  openGuardianFindings: number;
  onboardingIncomplete: boolean;
  reaction24hPct: number | null;
  wonLast30d: number;
}): number {
  let score = OPERATOR_HEALTH_WEIGHTS.BASE;

  const findingPenalty = Math.min(
    input.openGuardianFindings * Math.abs(OPERATOR_HEALTH_WEIGHTS.OPEN_GUARDIAN_FINDING),
    OPERATOR_HEALTH_WEIGHTS.OPEN_GUARDIAN_FINDING_CAP,
  );
  score -= findingPenalty;

  if (input.onboardingIncomplete) {
    score += OPERATOR_HEALTH_WEIGHTS.ONBOARDING_INCOMPLETE;
  }

  if (input.reaction24hPct === null) {
    score += OPERATOR_HEALTH_WEIGHTS.REACTION24H_UNKNOWN;
  } else if (input.reaction24hPct < OPERATOR_HEALTH_WEIGHTS.REACTION24H_LOW_THRESHOLD) {
    score += OPERATOR_HEALTH_WEIGHTS.REACTION24H_LOW;
  } else if (input.reaction24hPct >= OPERATOR_HEALTH_WEIGHTS.REACTION24H_GOOD_THRESHOLD) {
    score += OPERATOR_HEALTH_WEIGHTS.REACTION24H_GOOD;
  }

  const wonBonus = Math.min(
    input.wonLast30d * OPERATOR_HEALTH_WEIGHTS.WON_30D,
    OPERATOR_HEALTH_WEIGHTS.WON_30D_CAP,
  );
  score += wonBonus;

  return Math.max(0, Math.min(100, Math.round(score)));
}
