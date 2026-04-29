import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecisionFeatureFlags } from "@/lib/ai/decision-flags";
import type { DecisionPayload } from "@/lib/ai/decision-engine-types";

type Body = {
  leadId?: string;
};

export async function POST(req: Request) {
  const flags = getDecisionFeatureFlags();
  if (!flags.decisionEngineEnabled) {
    return NextResponse.json({ ok: false, error: "Decision engine disabled by feature flag." }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Body;
  if (!body.leadId) {
    return NextResponse.json({ ok: false, error: "Missing leadId" }, { status: 400 });
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, name, score, bri_score, budget, status")
    .eq("id", body.leadId)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
  }

  const baseScore = typeof lead.bri_score === "number" ? lead.bri_score : typeof lead.score === "number" ? lead.score : 50;
  const successProb = Math.max(0.05, Math.min(0.95, baseScore / 100));
  const budget = typeof lead.budget === "number" ? lead.budget : 1000;
  const expectedRevenue = Math.round(budget * successProb * 100) / 100;

  const payload: DecisionPayload = {
    leadId: lead.id,
    decision: {
      who: typeof lead.name === "string" && lead.name.trim() ? lead.name : "Lead",
      what: "Call with urgency script and one concrete next step.",
      when: successProb >= 0.7 ? "within_15_minutes" : "today_before_18_00",
      successProb,
      expectedRevenue,
      reason: `BRI/score=${baseScore} and status=${lead.status ?? "unknown"}`,
    },
    closingWindow: {
      minDays: successProb >= 0.7 ? 3 : 7,
      maxDays: successProb >= 0.7 ? 7 : 21,
      confidence: Math.max(0.5, Math.min(0.9, successProb)),
      reason: "Derived from current score and engagement status.",
    },
    risk: {
      level: successProb >= 0.7 ? "low" : successProb >= 0.45 ? "medium" : "high",
      trend: "flat",
      rescueSuggested: successProb < 0.45,
    },
  };

  await supabase.from("lead_action_scores").insert({
    lead_id: lead.id,
    who: payload.decision.who,
    what: payload.decision.what,
    when: payload.decision.when,
    success_prob: payload.decision.successProb,
    expected_revenue: payload.decision.expectedRevenue,
    reason: payload.decision.reason,
    model_version: "v1",
  });

  return NextResponse.json({ ok: true, payload });
}
