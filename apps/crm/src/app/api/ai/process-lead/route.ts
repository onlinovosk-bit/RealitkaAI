import { okResponse, errorResponse } from "@/lib/api-response";
import { getCurrentProfile } from "@/lib/auth";
import {
  fetchLeadAgencyId,
  runEnterprisePipelineAndPersist,
} from "@/lib/db/enterprise-intelligence-store";
import { isEnterpriseSalesIntelligenceEnabled } from "@/lib/enterprise-sales-intelligence-gate";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST — spustí Deal Moment + Risk + DNA + AI Action pre jeden lead (Enterprise).
 * Body: { leadId: string }
 */
export async function POST(req: Request) {
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

    const body = (await req.json()) as { leadId?: string };
    const leadId = body.leadId?.trim();
    if (!leadId) {
      return errorResponse("Chýba leadId.", 400);
    }

    const supabase = await createClient();
    const leadLookup = await fetchLeadAgencyId(supabase, leadId);
    if (!leadLookup.found) {
      return errorResponse("Lead sa nenašiel.", 404);
    }

    if (
      profile.agency_id &&
      leadLookup.agencyId &&
      leadLookup.agencyId !== profile.agency_id
    ) {
      return errorResponse("Nemáš prístup k tomuto leadu.", 403);
    }

    const agencyId = leadLookup.agencyId ?? profile.agency_id;

    const result = await runEnterprisePipelineAndPersist({
      supabase,
      leadId,
      agencyId,
    });

    return okResponse({
      score: result.score,
      risk: result.risk,
      isHot: result.isHot,
      action: result.action,
      dna: result.dna,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Chyba spracovania.",
      500
    );
  }
}
