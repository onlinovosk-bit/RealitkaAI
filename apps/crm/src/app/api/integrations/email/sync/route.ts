import { okResponse, errorResponse } from "@/lib/api-response";
import { syncEmailInbox } from "@/lib/integrations-store";
import { requireFeature } from "@/lib/feature-gating";

export async function POST() {
  try {
    await requireFeature("integrations");
    const result = await syncEmailInbox("");
    return okResponse({ result });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Email inbox sync zlyhal.",
      400
    );
  }
}
