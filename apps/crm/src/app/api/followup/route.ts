/**
 * Loop 1 — Follow-up Agent (DRAFT-ONLY). Generates approval drafts + open predictions.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  FOLLOWUP_AGENCY_ID,
  OPEN_LEAD_STATUSES,
  STALE_CONTACT_DAYS,
} from "@/lib/agents/followup/constants";
import { evaluateFollowupBatch } from "@/lib/agents/followup/engine";
import { computeContactedWithin24hPercent } from "@/lib/agents/followup/kpi";
import { writeOpenPredictions } from "@/lib/agents/followup/predictionWriter";
import type { DraftAction, FollowupLeadInput } from "@/lib/agents/followup/types";

const MS_PER_DAY = 86_400_000;

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`) {
    return true;
  }
  return process.env.NODE_ENV === "test";
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
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
  const drafts: DraftAction[] = engineResults
    .map((r) => r.draft)
    .filter((d): d is DraftAction => Boolean(d && d.decision !== "wait" && d.body));

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

  // TODO: route through Guardian before 5/5 — attach guardian review to each draft prior to broker send.

  return NextResponse.json({
    ok: true,
    mode: "draft_only",
    agencyId: FOLLOWUP_AGENCY_ID,
    staleCutoff,
    scanned: leads.length,
    drafts,
    predictionsWritten: predictionIds.length,
    predictionIds,
    kpi,
  });
}
