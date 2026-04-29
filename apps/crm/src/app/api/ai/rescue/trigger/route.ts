import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecisionFeatureFlags } from "@/lib/ai/decision-flags";
import type { RescuePlan } from "@/lib/ai/decision-engine-types";

type Body = {
  leadId?: string;
  triggerType?: string;
};

export async function POST(req: Request) {
  const flags = getDecisionFeatureFlags();
  if (!flags.rescueAutomationEnabled) {
    return NextResponse.json({ ok: false, error: "Rescue automation disabled by feature flag." }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Body;
  if (!body.leadId) return NextResponse.json({ ok: false, error: "Missing leadId" }, { status: 400 });

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, name, score, bri_score")
    .eq("id", body.leadId)
    .single();

  if (leadError || !lead) return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });

  const score = typeof lead.bri_score === "number" ? lead.bri_score : typeof lead.score === "number" ? lead.score : 50;
  const channel: RescuePlan["channel"] = score < 40 ? "call" : "sms";
  const scheduledFor = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const strategy = score < 40 ? "Urgent objection rescue + social proof" : "Quick value reminder + next slot";

  const plan: RescuePlan = {
    triggerType: body.triggerType ?? "risk_signal",
    strategy,
    channel,
    messagePreview:
      channel === "call"
        ? `Ahoj ${lead.name ?? ""}, ozývam sa krátko k ponuke. Mám pre teba novú možnosť, ktorá rieši tvoju hlavnú námietku.`
        : `Ahoj ${lead.name ?? ""}, mám pre teba krátky update k ponuke + 1 konkrétny ďalší krok. Stačí odpovedať "ÁNO".`,
    scheduledFor,
    status: "scheduled",
  };

  const { data: inserted, error: insertError } = await supabase
    .from("lead_rescue_runs")
    .insert({
      lead_id: lead.id,
      trigger_type: plan.triggerType,
      strategy: plan.strategy,
      channel: plan.channel,
      message_preview: plan.messagePreview,
      scheduled_for: plan.scheduledFor,
      status: plan.status,
    })
    .select("id")
    .single();

  if (insertError) return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });

  return NextResponse.json({ ok: true, leadId: lead.id, rescueRunId: inserted?.id, plan });
}
