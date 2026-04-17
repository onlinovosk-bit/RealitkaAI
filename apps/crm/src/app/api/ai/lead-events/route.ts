import { okResponse, errorResponse } from "@/lib/api-response";
import { getCurrentProfile } from "@/lib/auth";
import { fetchLeadAgencyId } from "@/lib/db/enterprise-intelligence-store";
import { isEnterpriseSalesIntelligenceEnabled } from "@/lib/enterprise-sales-intelligence-gate";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "email_open",
  "click",
  "call",
  "reply",
  "note",
]);

/**
 * POST — pridá udalosť k leadu (základ pre engine). Enterprise only.
 * Body: { leadId, type, value? }
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

    const body = (await req.json()) as {
      leadId?: string;
      type?: string;
      value?: string;
    };

    const leadId = body.leadId?.trim();
    const type = body.type?.trim() ?? "";
    if (!leadId || !type || !ALLOWED_TYPES.has(type)) {
      return errorResponse("Neplatný leadId alebo type.", 400);
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

    const { data, error } = await supabase
      .from("lead_events")
      .insert({
        agency_id: agencyId,
        lead_id: leadId,
        type,
        value: body.value ?? "",
      })
      .select("id, created_at")
      .single();

    if (error) {
      return errorResponse(error.message, 400);
    }

    return okResponse({ event: data });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Chyba zápisu udalosti.",
      500
    );
  }
}
