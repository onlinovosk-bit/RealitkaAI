import { okResponse, errorResponse } from "@/lib/api-response";
import {
  fetchAgencyManualPlan,
  manualPlanKeyToTier,
  resolveBillingPlanFromManualPlan,
} from "@/lib/billing/resolve-agency-manual-plan";
import { fetchAgencyCreditsSummary } from "@/lib/billing/fetch-agency-credits-summary";
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
    const creditsSummary = await fetchAgencyCreditsSummary(supabase, user.id);
    const creditsFields = creditsSummary
      ? {
          creditsBalance: creditsSummary.creditsBalance,
          grantBalance: creditsSummary.grantBalance,
          purchasedBalance: creditsSummary.purchasedBalance,
          monthlyGrantCredits: creditsSummary.monthlyGrantCredits,
        }
      : {
          creditsBalance: 0,
          grantBalance: 0,
          purchasedBalance: 0,
          monthlyGrantCredits: 0,
        };

    const manualPlan = await fetchAgencyManualPlan(supabase, user.id);
    const manualPlanKey = resolveBillingPlanFromManualPlan(manualPlan);
    if (manualPlanKey) {
      const enterpriseSalesIntelligence =
        await isEnterpriseSalesIntelligenceEnabled();
      return okResponse({
        tier: manualPlanKeyToTier(manualPlanKey),
        planKey: manualPlanKey,
        enterpriseSalesIntelligence,
        billingSource: "manual_invoice",
        ...creditsFields,
      });
    }

    const [tier, planKey, enterpriseSalesIntelligence] = await Promise.all([
      getCurrentPlanTier(),
      getCurrentPlanKey(),
      isEnterpriseSalesIntelligenceEnabled(),
    ]);
    return okResponse({
      tier,
      planKey,
      enterpriseSalesIntelligence,
      ...creditsFields,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa načítať plán.",
      400
    );
  }
}
