/**
 * Loop 1 — Follow-up Agent (DRAFT-ONLY). Generates approval drafts + open predictions.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import {
  FOLLOWUP_AGENCY_ID,
  OPEN_LEAD_STATUSES,
  STALE_CONTACT_DAYS,
} from "@/lib/agents/followup/constants";
import { evaluateFollowupBatch } from "@/lib/agents/followup/engine";
import { computeContactedWithin24hPercent } from "@/lib/agents/followup/kpi";
import { buildFollowupPreview, resolveFollowupAgencyId } from "@/lib/agents/followup/preview";
import { attachGuardianToDrafts, summarizeGuardianDrafts } from "@/lib/agents/followup/guardianReview";
import { writeOpenPredictions } from "@/lib/agents/followup/predictionWriter";
import type { DraftAction, FollowupLeadInput } from "@/lib/agents/followup/types";

const MS_PER_DAY = 86_400_000;

function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`) {
    return true;
  }
  return process.env.NODE_ENV === "test";
}

/** Read-only preview for CRM UI — no predictions written. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getCurrentProfile();
  const agencyId = resolveFollowupAgencyId(profile?.agency_id);
  const result = await buildFollowupPreview(agencyId);

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = (await import("@/lib/supabase/server")).createAdminClient();
  const staleCutoff = new Date(Date.now() - STALE_CONTACT_DAYS * MS_PER_DAY).toISOString();

  const { data: rows, error } = await admin
    .from("leads")
    .select("id,name,email,phone,status,last_contact,updated_at,source,created_at")
    .eq("agency_id", FOLLOWUP_AGENCY_ID)
    .in("status", [...OPEN_LEAD_STATUSES])
    .order("updated_at", { ascending: true })
    .limit(48);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const leads: FollowupLeadInput[] = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    name: String(r.name ?? ""),
    email: r.email ? String(r.email) : null,
    phone: r.phone ? String(r.phone) : null,
    status: String(r.status ?? ""),
    last_contact: r.last_contact ? String(r.last_contact) : null,
    updated_at: r.updated_at ? String(r.updated_at) : null,
    source: r.source ? String(r.source) : null,
  }));

  const engineResults = evaluateFollowupBatch(leads, { agencyId: FOLLOWUP_AGENCY_ID });
  const rawDrafts = engineResults
    .map((r) => r.draft)
    .filter((d): d is DraftAction => Boolean(d && d.decision !== "wait" && d.body));
  const drafts = attachGuardianToDrafts(rawDrafts, leads, FOLLOWUP_AGENCY_ID);
  const guardianSummary = summarizeGuardianDrafts(drafts);

  const predictions = engineResults
    .map((r) => r.prediction)
    .filter((p): p is NonNullable<typeof p> => p != null);

  let predictionIds: string[] = [];
  try {
    predictionIds = await writeOpenPredictions(predictions);
  } catch (writeError) {
    const message = writeError instanceof Error ? writeError.message : "Prediction write failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const kpiLeads = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    created_at: r.created_at ? String(r.created_at) : null,
    last_contact: r.last_contact ? String(r.last_contact) : null,
  }));
  const kpi = computeContactedWithin24hPercent(kpiLeads);

  return NextResponse.json({
    ok: true,
    mode: "draft_only",
    agencyId: FOLLOWUP_AGENCY_ID,
    staleCutoff,
    scanned: leads.length,
    drafts,
    guardianSummary,
    predictionsWritten: predictionIds.length,
    predictionIds,
    kpi,
  });
}
