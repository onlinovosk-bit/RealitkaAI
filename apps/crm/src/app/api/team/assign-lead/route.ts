import { okResponse, errorResponse } from "@/lib/api-response";
import { assignLeadToProfile } from "@/lib/team-store";
import { createActivity } from "@/lib/activities-store";
import { requireFeature } from "@/lib/feature-gating";

export async function POST(request: Request) {
  try {
    await requireFeature("teamManagement");

    const body = await request.json();

    const leadId = body?.leadId as string | undefined;
    const profileId = body?.profileId as string | undefined;

    if (!leadId || !profileId) {
      return errorResponse("Chýba leadId alebo profileId.", 400);
    }

    const result = await assignLeadToProfile(leadId, profileId);

    try {
      await createActivity({
        leadId,
        type: "Maklér",
        title: "Lead bol priradený agentovi",
        text: `Lead bol priradený agentovi (profileId: ${profileId}).`,
        entityType: "lead",
        entityId: leadId,
        actorName: profileId,
        source: "team",
        severity: "info",
        meta: { leadId, profileId },
      });
    } catch {}

    return okResponse({ result });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa priradiť lead.",
      400
    );
  }
}
