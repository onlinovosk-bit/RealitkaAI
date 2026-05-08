import { okResponse, errorResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import {
  recalculateAllMatches,
  recalculateMatchesForLead,
  recalculateMatchesForProperty,
} from "@/lib/matching-store";
import { createActivity } from "@/lib/activities-store";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  try {
    const body = await request.json().catch(() => ({}));
    const leadId = body?.leadId as string | undefined;
    const propertyId = body?.propertyId as string | undefined;

    if (leadId) {
      const result = await recalculateMatchesForLead(leadId);

      try {
        await createActivity({
          leadId,
          type: "Matching",
          title: "Manuálny prepočet matchingu pre lead",
          text: `Bol manuálne prepočítaný matching pre lead. Zapísaných zhôd: ${result.inserted}.`,
          entityType: "lead",
          entityId: leadId,
          actorName: "Systém",
          source: "matching",
          severity: "info",
          meta: result,
        });
      } catch {}

      return okResponse({ mode: "lead", result });
    }

    if (propertyId) {
      const result = await recalculateMatchesForProperty(propertyId);

      try {
        await createActivity({
          leadId: null,
          type: "Matching",
          title: "Manuálny prepočet matchingu pre nehnuteľnosť",
          text: `Bol manuálne prepočítaný matching pre nehnuteľnosť. Zapísaných zhôd: ${result.inserted}.`,
          entityType: "property",
          entityId: propertyId,
          actorName: "Systém",
          source: "matching",
          severity: "info",
          meta: result,
        });
      } catch {}

      return okResponse({ mode: "property", result });
    }

    const result = await recalculateAllMatches();

    try {
      await createActivity({
        leadId: null,
        type: "Matching",
        title: "Globálny manuálny prepočet matchingu",
        text: `Bol manuálne spustený globálny prepočet matchingu. Zapísaných zhôd: ${result.totalRows}.`,
        entityType: "matching",
        entityId: "global",
        actorName: "Systém",
        source: "matching",
        severity: "info",
        meta: result,
      });
    } catch {}

    return okResponse({ mode: "all", result });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa prepočítať matching.",
      400
    );
  }
}
