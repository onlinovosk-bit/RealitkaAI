import { okResponse, errorResponse } from "@/lib/api-response";
import { runAutopilotForLead } from "@/lib/ai/autopilot-runner";
import { getCurrentProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/leads-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (isSupabaseConfigured() && !profile) {
      return errorResponse("Neautorizovaný prístup.", 401);
    }

    const body = (await request.json()) as { leadId?: string };
    const leadId = String(body.leadId || "").trim();
    if (!leadId) {
      return errorResponse("Chýba leadId.", 400);
    }

    const result = await runAutopilotForLead(leadId);
    return okResponse(result);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Autopilot zlyhal.",
      400
    );
  }
}
