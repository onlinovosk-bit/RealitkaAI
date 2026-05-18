import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  lead_id: z.string().min(1),
  helpful: z.boolean(),
  note: z.string().max(2000).optional(),
});

/** Spätná väzba k AI triáži — posilňuje dôveru a dáta na zlepšenie (pre-mortem Sc. 3). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Validation error" }, { status: 400 });
  }

  const { lead_id, helpful, note } = parsed.data;

  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id")
    .eq("id", lead_id)
    .maybeSingle();

  if (leadErr || !lead) {
    return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
  }

  const { error: insErr } = await supabase.from("ai_triage_feedback").insert({
    lead_id,
    profile_id: user.id,
    helpful,
    note: note?.trim() || null,
  });

  if (insErr) {
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
