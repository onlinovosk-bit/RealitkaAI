/**
 * W3 — zápis výsledku analýzy hovoru ako poznámku + hlavná úloha (Supabase admin).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallAnalysisResult } from "@/lib/ai/call-analysis";

export async function persistCallAnalysisToCrm(
  admin: SupabaseClient,
  leadId: string,
  result: CallAnalysisResult
): Promise<{ activityId?: string; taskId?: string }> {
  const summaryBlock = [
    `Súhrn: ${result.summary}`,
    "",
    `Ďalší krok: ${result.nextAction}`,
    result.keyTopics?.length ? `Kľúčové témy: ${result.keyTopics.join("; ")}` : "",
    result.buying_signals?.length ? `Signály: ${result.buying_signals.join("; ")}` : "",
    result.objections?.length ? `Námietky: ${result.objections.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const { data: act, error: aErr } = await admin
    .from("activities")
    .insert({
      lead_id: leadId,
      type: "Hovor",
      title: "AI súhrn hovoru",
      text: summaryBlock.slice(0, 8000),
      entity_type: "lead",
      entity_id: leadId,
      actor_name: "Call analyzer",
      source: "ai_call_analyze",
      severity: "info",
      meta: {
        sentiment: result.sentiment,
        score: result.score,
      },
    })
    .select("id")
    .maybeSingle();

  if (aErr) throw new Error(aErr.message);

  const { data: task, error: tErr } = await admin
    .from("tasks")
    .insert({
      lead_id: leadId,
      title: result.nextAction.slice(0, 200),
      description: `Vygenerované z prepisu hovoru.\n\n${result.summary}`.slice(0, 4000),
      status: "open",
      priority: result.escalation_needed ? "high" : "medium",
      due_at: new Date(Date.now() + 86_400_000).toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (tErr) throw new Error(tErr.message);

  return { activityId: act?.id as string | undefined, taskId: task?.id as string | undefined };
}
