import { z } from "zod";
import { validateBody } from "@/lib/api-validate";
import { errorResponse, okResponse } from "@/lib/api-response";
import { getCurrentProfile } from "@/lib/auth";
import { requireFeature } from "@/lib/feature-gating";
import { approveAndSendInboundDraft } from "@/lib/inbound/approve-draft";
import { OUTREACH_AGENT_ID } from "@/lib/inbound/draft-view";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { incrementUsageMetric } from "@/lib/usage-metrics";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  leadId: z.string().min(1).max(64),
  activityId: z.string().min(1).max(64).optional(),
});

/**
 * POST /api/outreach/send
 * Step 2 of outreach: the broker approves a draft from /api/outreach/preview
 * and exactly that text is sent (shared approve path, Control Contract,
 * kill switch, send-once claim). No draft id → nothing is generated or sent.
 */
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return errorResponse("Unauthorized", 401);

  try {
    await requireFeature("outreach");
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Funkcia outreach nie je dostupná.", 403);
  }

  const { allowed } = await rateLimit(`outreach-send:${profile.auth_user_id ?? profile.id}`, 10, 60_000);
  if (!allowed) return errorResponse("Príliš veľa požiadaviek. Skúste znova o chvíľu.", 429);

  const parsed = await validateBody(request, BodySchema);
  if (!parsed.ok) return parsed.response;
  if (!parsed.data.activityId) {
    return errorResponse("Najprv vygenerujte návrh a skontrolujte text — outreach sa bez náhľadu neodosiela.", 400);
  }

  const admin = createServiceRoleClient();
  if (!admin) return errorResponse("Služba nie je dostupná.", 503);

  const result = await approveAndSendInboundDraft({
    admin,
    leadId: parsed.data.leadId,
    activityId: parsed.data.activityId,
    expectAgentId: OUTREACH_AGENT_ID,
    approver: {
      profileId: profile.id,
      agencyId: profile.agency_id,
      label: profile.email ?? profile.full_name ?? profile.id,
    },
  });
  if (!result.ok) return errorResponse(result.error, result.status);

  if (profile.agency_id) {
    await incrementUsageMetric({ agencyId: profile.agency_id, metric: "outreach_send" }).catch(
      (e) => console.error("[outreach-send] usage metric:", e),
    );
  }
  return okResponse({ messageId: result.messageId, approved: true });
}
