import { okResponse, errorResponse } from "@/lib/api-response";
import { autoErrorCapture } from "@/lib/auto-error-capture";
import { sendAiOutreachEmail } from "@/lib/outreach-store";
import { requireFeature } from "@/lib/feature-gating";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401);

    await requireFeature("outreach");

    const body = await request.json();
    const leadId = body?.leadId as string | undefined;

    if (!leadId) {
      return errorResponse("Chýba leadId.", 400);
    }

    // Pass the request-scoped client: without it the store falls back to the
    // browser singleton and every real lead resolves to "Lead nebol nájdený".
    // A signed-in broker's explicit click is the human approval the
    // Control Contract requires (outreach.email.send floors at APPROVAL_REQUIRED).
    const result = await sendAiOutreachEmail(leadId, supabase, {
      approvalId: `outreach_send:${leadId}:${Date.now()}`,
      approvedBy: user.email ?? user.id,
      approvedAt: new Date().toISOString(),
    });
    return okResponse({ result });
  } catch (error) {
    const result = autoErrorCapture(error, "POST /api/outreach/send");
    return errorResponse(result.error, 400);
  }
}
