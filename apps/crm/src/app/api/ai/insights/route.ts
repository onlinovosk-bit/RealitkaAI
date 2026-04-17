import { okResponse, errorResponse } from "@/lib/api-response";
import { getCurrentProfile } from "@/lib/auth";
import { listEnterpriseInsights } from "@/lib/db/enterprise-intelligence-store";
import { isEnterpriseSalesIntelligenceEnabled } from "@/lib/enterprise-sales-intelligence-gate";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET — zoznam posledných AI akcií / insightov pre dashboard (Enterprise).
 */
export async function GET() {
  try {
    const enabled = await isEnterpriseSalesIntelligenceEnabled();
    if (!enabled) {
      return errorResponse(
        "Enterprise Sales Intelligence je dostupné len pre plán Enterprise.",
        403
      );
    }

    const profile = await getCurrentProfile();
    if (!profile) {
      return errorResponse("Unauthorized", 401);
    }

    const supabase = await createClient();
    const insights = await listEnterpriseInsights(
      supabase,
      profile.agency_id,
      40
    );

    return okResponse({ insights });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Chyba načítania.",
      500
    );
  }
}
