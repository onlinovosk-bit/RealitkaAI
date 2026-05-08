import { okResponse, errorResponse } from "@/lib/api-response";
import { getCurrentProfile } from "@/lib/auth";
import { getCalendarIntegration, syncCalendarFromIcs } from "@/lib/integrations-store";
import { requireFeature } from "@/lib/feature-gating";

export async function POST() {
  try {
    await requireFeature("integrations");

    const profile = await getCurrentProfile();
    if (!profile) return errorResponse("Neautorizovaný prístup.", 401);

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
