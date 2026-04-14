import { okResponse, errorResponse } from "@/lib/api-response";
import { autoErrorCapture } from "@/lib/auto-error-capture";
import { logAiActionAudit } from "@/lib/ai-action-audit";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { fetchLeadAgencyId } from "@/lib/outbound-orchestrator";
import { requireFeature } from "@/lib/feature-gating";
import { sendAiOutreachEmail } from "@/lib/outreach-store";
import { SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";

/**
 * POST /api/outreach/approve
 * Explicitné schválenie odoslania (audit „human_approved“) + rovnaký send pipeline.
 */
export async function POST(request: Request) {
  try {
    await requireFeature("outreach");

    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Neautorizovaný prístup.", 401);
    }

    const profile = await getCurrentProfile();
    const body = await request.json();
    const leadId = body?.leadId as string | undefined;

    if (!leadId) {
      return errorResponse("Chýba leadId.", 400);
    }

    const agencyId =
      (await fetchLeadAgencyId(leadId)) ??
      profile?.agency_id ??
      SYSTEM_USAGE_AGENCY_ID;

    await logAiActionAudit({
      agencyId,
      leadId,
      profileId: profile?.id ?? null,
      actionKind: "human_approved",
      channel: "email",
      meta: { approvedBy: user.email ?? user.id },
    });

    const result = await sendAiOutreachEmail(leadId);
    return okResponse({ result, approved: true });
  } catch (error) {
    const result = autoErrorCapture(error, "POST /api/outreach/approve");
    return errorResponse(result.error, 400);
  }
}
