import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecisionFeatureFlags } from "@/lib/ai/decision-flags";
import { generateRescuePlan } from "@/lib/ai/rescue-message";
import type { RescueChannel } from "@/lib/ai/rescue-message";

type Body = {
  leadId?:     string;
  triggerType?: string;
  channel?:    RescueChannel;
};

export async function POST(req: Request) {
  const flags = getDecisionFeatureFlags();
  if (!flags.rescueAutomationEnabled) {
    return NextResponse.json({ ok: false, error: "Rescue automation disabled by feature flag." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Body;
  if (!body.leadId) return NextResponse.json({ ok: false, error: "Missing leadId" }, { status: 400 });

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, name, score, bri_score, status, budget, property_type, location, last_contact_at")
    .eq("id", body.leadId)
    .single();

  if (leadError || !lead) return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });

  // Načítaj poslednú poznámku/správu
  const { data: lastActivity } = await supabase
    .from("activities")
    .select("type, created_at")
    .eq("lead_id", body.leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const score = typeof lead.bri_score === "number" ? lead.bri_score : typeof lead.score === "number" ? lead.score : 50;
  const channel: RescueChannel = body.channel ?? (score < 40 ? "call" : "sms");

  // KF6 — Reálna Claude rescue správa
  const plan = await generateRescuePlan(
    {
      leadName:        lead.name ?? "klient",
      score,
      lastInteraction: lead.last_contact_at ?? undefined,
      status:          lead.status ?? undefined,
      budget:          lead.budget ?? undefined,
      propertyType:    lead.property_type ?? undefined,
      location:        lead.location ?? undefined,
      lastNote:        lastActivity?.type ?? undefined,
      triggerType:     body.triggerType ?? "risk_signal",
    },
    channel
  );

  const { data: inserted, error: insertError } = await supabase
    .from("lead_rescue_runs")
    .insert({
      lead_id:         lead.id,
      trigger_type:    plan.strategy,
      strategy:        plan.strategy,
      channel:         plan.channel,
      message_preview: plan.messagePreview,
      scheduled_for:   plan.scheduledFor,
      status:          plan.status,
    })
    .select("id")
    .single();

  if (insertError) return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });

  return NextResponse.json({ ok: true, leadId: lead.id, rescueRunId: inserted?.id, plan });
}
