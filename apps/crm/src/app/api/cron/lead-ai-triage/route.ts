/**
 * W1 — denná batch Haiku triáž otvorených leadov → ai_priority / ai_reason (SK).
 * vercel.json: schedule napr. 0 5 * * * (pred ranným briefom).
 */
import { NextRequest, NextResponse } from "next/server";

import { executeTriageWithIdempotency } from "@/ai/triage-with-idempotency";
import { createAdminClient } from "@/lib/supabase/server";

const OPEN_STATUSES = ["Nový", "Teplý", "Horúci", "Obhliadka", "Ponuka"];

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const limit = Math.min(Number(process.env.TRIAGE_LEAD_LIMIT ?? "200"), 500);

  const { data: rows, error } = await admin
    .from("leads")
    .select("id,name,status,score,last_contact,note,source,ai_priority_manual_at")
    .in("status", OPEN_STATUSES)
    .is("ai_priority_manual_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const list = rows ?? [];
  try {
    const outcome = await executeTriageWithIdempotency(admin, list);
    return NextResponse.json({
      ok: true,
      examined: list.length,
      processed: outcome.processed,
      updated: outcome.updated,
      skipped_dupe: outcome.skipped_dupe,
      triaged_at: outcome.triaged_at,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: msg, queued: list.length },
      { status: 500 },
    );
  }
}
