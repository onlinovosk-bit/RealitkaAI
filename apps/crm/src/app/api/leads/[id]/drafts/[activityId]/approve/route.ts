import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { approveAndSendInboundDraft } from "@/lib/inbound/approve-draft";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const block = await checkAiRateLimit(profile.auth_user_id ?? profile.id, "inbound-draft-approve", 10);
  if (block) return NextResponse.json({ ok: false, error: block.error }, { status: 429 });

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Služba nie je dostupná." }, { status: 503 });
  }

  const { id, activityId } = await params;
  const result = await approveAndSendInboundDraft({
    admin,
    leadId: id,
    activityId,
    approver: {
      profileId: profile.id,
      agencyId: profile.agency_id,
      label: profile.email ?? profile.full_name ?? profile.id,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, messageId: result.messageId });
}
