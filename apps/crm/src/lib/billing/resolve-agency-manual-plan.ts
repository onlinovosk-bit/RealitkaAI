import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResolvedBillingPlan } from "@/lib/billing-store";
import { PLAN_KEYS } from "@/lib/billing-types";
import { getAgencyIdForAuthUser } from "@/lib/auth";

const MANUAL_PLAN_TO_BILLING_KEY: Record<string, ResolvedBillingPlan> = {
  free: "free",
  starter: PLAN_KEYS.STARTER,
  pro: PLAN_KEYS.PRO,
  active_force: PLAN_KEYS.PRO,
  scale: PLAN_KEYS.ENTERPRISE,
  market_vision: PLAN_KEYS.ENTERPRISE,
  enterprise: PLAN_KEYS.ENTERPRISE,
  protocol_authority: PLAN_KEYS.COMMAND,
};

export function resolveBillingPlanFromManualPlan(
  manualPlan: string | null | undefined,
): ResolvedBillingPlan | null {
  const key = manualPlan?.trim().toLowerCase();
  if (!key) return null;
  return MANUAL_PLAN_TO_BILLING_KEY[key] ?? null;
}

export async function fetchAgencyManualPlan(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<string | null> {
  const agencyId = await getAgencyIdForAuthUser(supabase, authUserId);
  if (!agencyId) return null;

  const { data } = await supabase
    .from("agencies")
    .select("manual_plan")
    .eq("id", agencyId)
    .maybeSingle();

  return data?.manual_plan ?? null;
}

export function manualPlanKeyToTier(planKey: ResolvedBillingPlan): "free" | "pro" {
  if (planKey === "free") return "free";
  return "pro";
}
