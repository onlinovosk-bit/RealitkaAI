import { okResponse, errorResponse } from "@/lib/api-response";
import {
  getCurrentPlanKey,
  getCurrentPlanTier,
} from "@/lib/billing-store";
import { isEnterpriseSalesIntelligenceEnabled } from "@/lib/enterprise-sales-intelligence-gate";

export async function GET() {
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
