import { okResponse, errorResponse } from "@/lib/api-response";
import { syncCalendarFromIcs } from "@/lib/integrations-store";
import { requireFeature } from "@/lib/feature-gating";

export async function POST() {
  try {
    await requireFeature("integrations");
    const result = await syncCalendarFromIcs("", "");
    return okResponse({ result });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Calendar sync zlyhal.",
      400
    );
  }
}
