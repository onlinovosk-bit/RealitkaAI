import { PLAN_KEYS, type PlanKey } from "@/lib/billing-types";
import { getCurrentPlanKey } from "@/lib/billing-store";

/**
 * Enterprise-only: Deal Moment + Risk + Client DNA + AI Actions pipeline.
 */
export async function isEnterpriseSalesIntelligenceEnabled(): Promise<boolean> {
  if (process.env.ENTERPRISE_AI_INTELLIGENCE_DEV === "1") {
    return true;
  }
  const key = await getCurrentPlanKey();
  return key === PLAN_KEYS.ENTERPRISE;
}

export function planKeyEnablesEnterpriseIntel(key: PlanKey | "free"): boolean {
  if (process.env.ENTERPRISE_AI_INTELLIGENCE_DEV === "1") return true;
  return key === PLAN_KEYS.ENTERPRISE;
}
