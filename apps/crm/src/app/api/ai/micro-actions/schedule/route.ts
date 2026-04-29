import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecisionFeatureFlags } from "@/lib/ai/decision-flags";

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
  if (!body.leadId) return NextResponse.json({ ok: false, error: "Missing leadId" }, { status: 400 });

  const now = Date.now();
  const actions = [
    {
      action_type: "followup_sms",
      action_payload: { template: "quick_value_nudge", locale: "sk-SK" },
      scheduled_for: new Date(now + 10 * 60 * 1000).toISOString(),
    },
    {
      action_type: "call_task",
      action_payload: { script: "objection_rescue_v1", duration_min: 5 },
      scheduled_for: new Date(now + 60 * 60 * 1000).toISOString(),
    },
    {
      action_type: "email_recap",
      action_payload: { template: "summary_next_step", locale: "sk-SK" },
      scheduled_for: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const { data: inserted, error } = await supabase
    .from("lead_micro_actions")
    .insert(
      actions.map((action) => ({
        lead_id: body.leadId,
        action_type: action.action_type,
        action_payload: action.action_payload,
        scheduled_for: action.scheduled_for,
        status: "scheduled",
      }))
    )
    .select("id, action_type, scheduled_for, status");

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, leadId: body.leadId, actions: inserted ?? [] });
}
