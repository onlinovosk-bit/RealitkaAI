import { createClient } from "@/lib/supabase/server";
import { callOpenAI } from "@/lib/ai/openai";

export type ActionType = "send_email" | "create_task" | "notify_agent";
export type ActionPayload = { type: ActionType; leadId: string; agentId?: string; message?: string };

export async function executeAction(p: ActionPayload): Promise<{ ok: boolean; detail?: string }> {
  const supabase = await createClient();

  if (p.type === "create_task") {
    const message = p.message ?? await generateTaskText(p.leadId);
    const { error } = await supabase.from("tasks").insert({
      lead_id:     p.leadId,
      title:       message,
      status:      "pending",
      source:      "autopilot",
      created_at:  new Date().toISOString(),
    });
    return error ? { ok: false, detail: error.message } : { ok: true, detail: "task_created" };
  }

  if (p.type === "notify_agent") {
    const { error } = await supabase.from("notifications").insert({
      lead_id:    p.leadId,
      agent_id:   p.agentId ?? null,
      message:    p.message ?? "Autopilot upozornenie: príležitosť potrebuje pozornosť.",
      type:       "autopilot",
      is_read:    false,
      created_at: new Date().toISOString(),
    });
    return error ? { ok: false, detail: error.message } : { ok: true, detail: "agent_notified" };
  }

  if (p.type === "send_email") {
    // Log intent to outreach_log — actual email delivery is handled by scheduled-outreach cron
    const { error } = await supabase.from("outreach_log").insert({
      lead_id:    p.leadId,
      channel:    "email",
      message:    p.message ?? "Autopilot follow-up.",
      status:     "queued",
      created_at: new Date().toISOString(),
    });
    return error ? { ok: false, detail: error.message } : { ok: true, detail: "email_queued" };
  }

  return { ok: false, detail: `unknown_action_type:${p.type}` };
}

async function generateTaskText(leadId: string): Promise<string> {
  // Tenant príležitosti sa číta kvôli účtovaniu AI spotreby. Zlyhanie je nemé —
  // meranie spadne na systémového tenanta, text úlohy sa tým nemení.
  let agencyId: string | undefined;
  try {
    const supabase = await createClient();
    const { data: lead } = await supabase
      .from("leads")
      .select("agency_id")
      .eq("id", leadId)
      .maybeSingle();
    agencyId = lead?.agency_id ?? undefined;
  } catch {
    agencyId = undefined;
  }

  try {
    const { content } = await callOpenAI({
      model:      "gpt-4o-mini",
      max_tokens: 30,
      tag:        "autopilot-task",
      agencyId,
      messages: [{
        role:    "user",
        content: `Vygeneruj krátky (max 8 slov, slovensky) názov úlohy pre makléra ohľadom príležitosti ID ${leadId}. Iba text, žiadne úvodzovky.`,
      }],
    });
    return content.trim() || "Skontaktovať príležitosť";
  } catch {
    return "Skontaktovať príležitosť";
  }
}
