import { okResponse, errorResponse } from "@/lib/api-response";
import {
  fetchAgencyManualPlan,
  manualPlanKeyToTier,
  resolveBillingPlanFromManualPlan,
} from "@/lib/billing/resolve-agency-manual-plan";
import { fetchAgencyCreditsSummary } from "@/lib/billing/fetch-agency-credits-summary";
import { getCurrentPlanKey } from "@/lib/billing-store";
import {
  isEnterpriseSalesIntelligenceEnabled,
  planKeyEnablesEnterpriseIntel,
} from "@/lib/enterprise-sales-intelligence-gate";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  try {
    // Paralelne — credits a manual plan su nezavisle Supabase dotazy.
    const [creditsSummary, manualPlan] = await Promise.all([
      fetchAgencyCreditsSummary(supabase, user.id),
      fetchAgencyManualPlan(supabase, user.id),
    ]);
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

    // Jeden zdielany billing status: planKey nacitame raz zo Stripe a tier aj
    // enterprise flag odvodime lokalne — ziadne dalsie Stripe round-tripy.
    const planKey = await getCurrentPlanKey();
    const tier: "free" | "pro" = planKey === "free" ? "free" : "pro";
    const enterpriseSalesIntelligence = planKeyEnablesEnterpriseIntel(planKey);
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
