import { z } from "zod";
import { validateBody } from "@/lib/api-validate";
import { errorResponse, okResponse } from "@/lib/api-response";
import { autoErrorCapture } from "@/lib/auto-error-capture";
import { getCurrentProfile } from "@/lib/auth";
import { requireFeature } from "@/lib/feature-gating";
import { prepareOutreachDraft } from "@/lib/outreach-store";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { incrementUsageMetric } from "@/lib/usage-metrics";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ leadId: z.string().min(1).max(64) });

/**
 * POST /api/outreach/preview
 * Step 1 of outreach: writes the AI e-mail as a draft and returns its exact
 * text. Nothing is sent — the broker approves it via /api/outreach/send.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  try {
    await requireFeature("outreach");
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Funkcia outreach nie je dostupná.", 403);
  }

  try {
    const { allowed } = await rateLimit(`outreach-preview:${user.id}`, 10, 60_000);
    if (!allowed) return errorResponse("Príliš veľa požiadaviek. Skúste znova o chvíľu.", 429);

    const parsed = await validateBody(request, BodySchema);
    if (!parsed.ok) return parsed.response;

    const admin = createServiceRoleClient();
    if (!admin) return errorResponse("Služba nie je dostupná.", 503);

    const profile = await getCurrentProfile();
    const draft = await prepareOutreachDraft({
      leadId: parsed.data.leadId,
      scopedSupabase: supabase,
      admin,
      profileId: profile?.id ?? null,
    });
    if (!draft.ok) return errorResponse(draft.error, draft.status);

    // The tokens are spent now, whether or not the broker sends.
    await incrementUsageMetric({
      agencyId: draft.usage.agencyId,
      metric: "ai_openai_tokens",
      delta: draft.usage.tokens,
    }).catch((e) => console.error("[outreach-preview] usage metric:", e));

    const { activityId, to, subject, body } = draft;
    return okResponse({ draft: { activityId, to, subject, body } });
  } catch (error) {
    const result = autoErrorCapture(error, "POST /api/outreach/preview");
    return errorResponse(result.error, 500);
  }
}
