import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_AUTOPILOT_RULES } from "@/lib/ai/autopilot-rules";
import { runAutopilotRules } from "@/lib/ai/autopilot-runner";
import { executeAction } from "@/lib/ai/action-executor";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { leadId: string; score?: number; daysSinceContact?: number; emailClicked?: boolean };
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const results = await runAutopilotRules(
    {
      leadId:          body.leadId,
      score:           body.score          ?? 50,
      daysSinceContact: body.daysSinceContact ?? 0,
      emailClicked:    body.emailClicked    ?? false,
    },
    DEFAULT_AUTOPILOT_RULES
  );

  // Dispatch actions for matched rules
  const dispatched: { ruleId: string; ok: boolean; detail?: string }[] = [];
  for (const result of results) {
    if (!result.executed) continue;
    const { ok, detail } = await executeAction({
      type:   result.action,
      leadId: body.leadId,
    });
    dispatched.push({ ruleId: result.ruleId, ok, detail });
  }

  return NextResponse.json({ ok: true, results, dispatched });
}
