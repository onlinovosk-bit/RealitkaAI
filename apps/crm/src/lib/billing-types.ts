/**
 * Revolis.AI – Billing types & plan limits
 * Centrálny zdroj pravdy pre všetky feature gates a plan limity.
 */

export const PLAN_KEYS = {
  STARTER:    "starter",
  PRO:        "pro",
  ENTERPRISE: "enterprise",
} as const;

export type PlanKey = (typeof PLAN_KEYS)[keyof typeof PLAN_KEYS];

export const PLAN_LIMITS = {
  starter: {
    maxAgents:           3,
    maxLeadsPerMonth:    100,
    aiScoring:           true,
    aiMatching:          false,
    portalIntegrations:  false,
    performanceFee:      false,
    multiTeam:           false,
    customAiModels:      false,
  },
  pro: {
    maxAgents:           -1, // neobmedzene
    maxLeadsPerMonth:    -1,
    aiScoring:           true,
    aiMatching:          true,
    portalIntegrations:  true,
    performanceFee:      false,
    multiTeam:           false,
    customAiModels:      false,
  },
  enterprise: {
    maxAgents:           -1,
    maxLeadsPerMonth:    -1,
    aiScoring:           true,
    aiMatching:          true,
    portalIntegrations:  true,
    performanceFee:      true,  // 2% z AI-sourced obchodov, max 500€
    multiTeam:           true,
    customAiModels:      true,
  },
} as const satisfies Record<PlanKey, object>;

export type PlanLimits = (typeof PLAN_LIMITS)[PlanKey];

/** Pomocník: vráti limity pre daný plan key (fallback na starter) */
export function getPlanLimits(planKey: string): PlanLimits {
  return PLAN_LIMITS[planKey as PlanKey] ?? PLAN_LIMITS.starter;
}

/** Pomocník: či má plan daný feature */
export function planHasFeature(
  planKey: string,
  feature: keyof PlanLimits
): boolean {
  const limits = getPlanLimits(planKey);
  const val = limits[feature];
  return val === true || (typeof val === "number" && val === -1);
}
