import { okResponse, errorResponse } from "@/lib/api-response";
import { getCurrentProfile } from "@/lib/auth";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { getCalendarIntegration, syncCalendarFromIcs } from "@/lib/integrations-store";
import { requireFeature } from "@/lib/feature-gating";

export async function POST() {
  try {
    await requireFeature("integrations");

    const profile = await getCurrentProfile();
    if (!profile) return errorResponse("Neautorizovaný prístup.", 401);

    const block = await checkAiRateLimit(profile.auth_user_id ?? profile.id, "calendar-sync", 2);
    if (block) return errorResponse(block.error, 429);

    const integration = await getCalendarIntegration(profile.id);
    if (!integration?.calendarIcsUrl) {
      return errorResponse("ICS kalendár nie je nakonfigurovaný.", 400);
    }

    const result = await syncCalendarFromIcs(integration.calendarIcsUrl, profile.id);
    return okResponse({ result });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Calendar sync zlyhal.",
      400
    );
  }
}
