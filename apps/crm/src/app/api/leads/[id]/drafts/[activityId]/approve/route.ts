import { z } from "zod";
import { validateQuery } from "@/lib/api-validate";
import { errorResponse, okResponse } from "@/lib/api-response";
import { getCurrentProfile } from "@/lib/auth";
import { approveAndSendInboundDraft } from "@/lib/inbound/approve-draft";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { incrementUsageMetric } from "@/lib/usage-metrics";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  id: z.string().min(1).max(64),
  activityId: z.string().min(1).max(64),
});

/**
 * POST /api/leads/:id/drafts/:activityId/approve
 * Broker approves an inbound AI reply draft; the stored text is sent verbatim.
 * Tier 3 (Revolis System Spec §13): this is a human action — no body needed.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; activityId: string }> },
) {
  const profile = await getCurrentProfile();
  if (!profile) return errorResponse("Unauthorized", 401);

  const { allowed } = await rateLimit(
    `inbound-draft-approve:${profile.auth_user_id ?? profile.id}`,
    10,
    60_000,
  );
  if (!allowed) return errorResponse("Príliš veľa požiadaviek. Skúste znova o chvíľu.", 429);

  const parsed = validateQuery(new URLSearchParams(await params), ParamsSchema);
  if (!parsed.ok) return parsed.response;

  const admin = createServiceRoleClient();
  if (!admin) return errorResponse("Služba nie je dostupná.", 503);

  const result = await approveAndSendInboundDraft({
    admin,
    leadId: parsed.data.id,
    activityId: parsed.data.activityId,
    approver: {
      profileId: profile.id,
      agencyId: profile.agency_id,
      label: profile.email ?? profile.full_name ?? profile.id,
    },
  });

  if (!result.ok) return errorResponse(result.error, result.status);

  if (profile.agency_id) {
    await incrementUsageMetric({ agencyId: profile.agency_id, metric: "outreach_send" }).catch(
      (e) => console.error("[inbound-draft-approve] usage metric:", e),
    );
  }
  return okResponse({ messageId: result.messageId });
}
