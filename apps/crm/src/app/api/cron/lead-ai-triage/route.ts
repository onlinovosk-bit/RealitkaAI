/**
 * W1 — denná batch Haiku triáž otvorených leadov → ai_priority / ai_reason (SK).
 * vercel.json: schedule napr. 0 5 * * * (pred ranným briefom).
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  triageLeadBatches,
  TRIAGE_LOW_CONTEXT_REASON,
  type TriageLeadInput,
} from "@/lib/ai/lead-triage-batch";

const OPEN_STATUSES = ["Nový", "Teplý", "Horúci", "Obhliadka", "Ponuka"];

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const limit = Math.min(Number(process.env.TRIAGE_LEAD_LIMIT ?? "200"), 500);
  const agencyFilter = process.env.TRIAGE_AGENCY_ID?.trim() || null;

  let query = admin
    .from("leads")
    .select("id,name,status,score,last_contact,note,source,ai_priority_manual_at,agency_id")
    .in("status", OPEN_STATUSES)
    .is("ai_priority_manual_at", null)
    .is("ai_triage_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (agencyFilter) {
    query = query.eq("agency_id", agencyFilter);
  }

  const { data: rows, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const list = rows ?? [];
  const inputs: TriageLeadInput[] = list.map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ""),
    status: String(r.status ?? ""),
    score: Number(r.score ?? 0),
    last_contact: r.last_contact ?? "",
    note: r.note ?? "",
    source: r.source ?? "",
  }));

  let updated = 0;
  let heuristicOnly = 0;
  const triagedAt = new Date().toISOString();

  if (inputs.length > 0) {
    try {
      const results = await triageLeadBatches(inputs);
      for (const row of results) {
        if (row.reason === TRIAGE_LOW_CONTEXT_REASON) heuristicOnly += 1;

        const { error: upErr } = await admin
          .from("leads")
          .update({
            ai_priority: row.priority,
            ai_reason: row.reason,
            ai_triage_at: triagedAt,
          })
          .eq("id", row.lead_id);

        if (!upErr) updated += 1;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isConfig =
        /ANTHROPIC_API_KEY|OPENAI_API_KEY|nie je nastaven/i.test(msg);
      return NextResponse.json(
        { ok: false, error: msg, queued: inputs.length },
        { status: isConfig ? 503 : 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    processed: inputs.length,
    updated,
    heuristic_only: heuristicOnly,
    agency_filter: agencyFilter,
    triaged_at: triagedAt,
  });
}
