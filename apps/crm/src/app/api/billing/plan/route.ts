import { okResponse, errorResponse } from "@/lib/api-response";
import {
  getCurrentPlanKey,
  getCurrentPlanTier,
} from "@/lib/billing-store";
import { isEnterpriseSalesIntelligenceEnabled } from "@/lib/enterprise-sales-intelligence-gate";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  try {
    const [tier, planKey, enterpriseSalesIntelligence] = await Promise.all([
      getCurrentPlanTier(),
      getCurrentPlanKey(),
      isEnterpriseSalesIntelligenceEnabled(),
    ]);
    return okResponse({
      tier,
      planKey,
      enterpriseSalesIntelligence,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa načítať plán.",
      400
    );
  }
}
