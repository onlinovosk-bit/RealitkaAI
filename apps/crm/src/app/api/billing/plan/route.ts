import { okResponse, errorResponse } from "@/lib/api-response";
import {
  getCurrentPlanKey,
  getCurrentBillingStatus,
} from "@/lib/billing-store";
import { isEnterpriseSalesIntelligenceEnabled } from "@/lib/enterprise-sales-intelligence-gate";
import {
  getPlanLabel,
  resolveEffectivePlanKey,
  type DisplayPlanKey,
} from "@/lib/plan-display";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  try {
    const [{ data: profile }, stripePlanKey, billingStatus, enterpriseSalesIntelligence] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("account_tier, ui_role, protocol_active")
          .eq("auth_user_id", user.id)
          .maybeSingle(),
        getCurrentPlanKey(),
        getCurrentBillingStatus(),
        isEnterpriseSalesIntelligenceEnabled(),
      ]);

    const planKey: DisplayPlanKey = resolveEffectivePlanKey(profile, stripePlanKey);
    const tier = planKey === "free" ? "free" : "pro";

    return okResponse({
      tier,
      planKey,
      planLabel: getPlanLabel(planKey),
      canManageInStripe: billingStatus.hasCustomer,
      enterpriseSalesIntelligence,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa načítať plán.",
      400
    );
  }
}
