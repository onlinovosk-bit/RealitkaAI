import { okResponse, errorResponse } from "@/lib/api-response";
import { autoErrorCapture } from "@/lib/auto-error-capture";
import { sendAiOutreachEmail } from "@/lib/outreach-store";
import { requireFeature } from "@/lib/feature-gating";

export async function POST(request: Request) {
  try {
    await requireFeature("outreach");

    const body = await request.json();
    const leadId = body?.leadId as string | undefined;

    if (!leadId) {
      return errorResponse("Chýba leadId.", 400);
    }

    const result = await sendAiOutreachEmail(leadId);
    return okResponse({ result });
  } catch (error) {
    const result = autoErrorCapture(error, "POST /api/outreach/send");
    return errorResponse(result.error, 400);
  }
}
