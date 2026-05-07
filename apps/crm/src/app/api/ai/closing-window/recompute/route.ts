import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecisionFeatureFlags } from "@/lib/ai/decision-flags";

type Body = {
  leadId?: string;
};

export async function POST(req: Request) {
  const flags = getDecisionFeatureFlags();
  if (!flags.closingWindowEnabled) {
    return NextResponse.json({ ok: false, error: "Closing window model disabled by feature flag." }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).single();

  const body = (await req.json()) as Body;
  if (!body.leadId) return NextResponse.json({ ok: false, error: "Missing leadId" }, { status: 400 });

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, score, bri_score, status")
    .eq("id", body.leadId)
    .eq("assigned_profile_id", profile?.id ?? "")
    .single();

  if (leadError || !lead) return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });

  const score = typeof lead.bri_score === "number" ? lead.bri_score : typeof lead.score === "number" ? lead.score : 50;
  const minDays = score >= 80 ? 3 : score >= 60 ? 7 : 14;
  const maxDays = score >= 80 ? 7 : score >= 60 ? 14 : 30;
  const confidence = Math.max(0.5, Math.min(0.9, score / 100));

  const { error: upsertError } = await supabase.from("lead_closing_windows").upsert(
    {
      lead_id: lead.id,
      min_days: minDays,
      max_days: maxDays,
      confidence,
      reason: `Derived from score=${score} and status=${lead.status ?? "unknown"}`,
      model_version: "v1",
    },
    { onConflict: "lead_id" }
  );

  if (upsertError) return NextResponse.json({ ok: false, error: upsertError.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    closingWindow: {
      minDays,
      maxDays,
      confidence,
      reason: `Derived from score=${score}`,
    },
  });
}
