/**
 * Wraps lib batch triage to log AI request outcomes without editing @/lib/ai.
 */
import {
  triageLeadBatches,
  type LeadTriageOutput,
  type TriageLeadInput,
} from "@/lib/ai/lead-triage-batch";
import { logAiTriage } from "@/logger/ai-triage-log";

const DEGRADED_MARKERS = [
  "Fallback skóre",
  "Automatická záloha",
  "Chýbal záznam v batch výstupe",
  "AI volanie zlyhalo",
];

export async function executeTriageLeadBatchesWithLogging(
  leads: TriageLeadInput[],
  meta: {
    run_id: string;
    source: string;
    by_tenant: Record<string, number>;
  },
): Promise<LeadTriageOutput[]> {
  if (leads.length === 0) {
    return [];
  }

  const startedAt = Date.now();
  try {
    const results = await triageLeadBatches(leads);
    const durationMs = Date.now() - startedAt;

    let degradedOutputs = 0;
    for (const row of results) {
      if (DEGRADED_MARKERS.some((m) => row.reason.includes(m))) {
        degradedOutputs += 1;
      }
    }

    logAiTriage({
      event: "ai_triage_ai_batch_done",
      run_id: meta.run_id,
      source: meta.source,
      lead_count: leads.length,
      duration_ms: durationMs,
      by_tenant: meta.by_tenant,
      degraded_output_count: degradedOutputs,
    });

    if (degradedOutputs > 0) {
      logAiTriage({
        event: "ai_triage_ai_batch_degraded",
        run_id: meta.run_id,
        source: meta.source,
        lead_count: leads.length,
        degraded_output_count: degradedOutputs,
        by_tenant: meta.by_tenant,
      });
    }

    return results;
  } catch (e) {
    const durationMs = Date.now() - startedAt;
    const message = e instanceof Error ? e.message : String(e);
    logAiTriage({
      event: "ai_triage_ai_request_failure",
      run_id: meta.run_id,
      source: meta.source,
      lead_count: leads.length,
      duration_ms: durationMs,
      by_tenant: meta.by_tenant,
      error: message.slice(0, 800),
    });
    throw e;
  }
}
