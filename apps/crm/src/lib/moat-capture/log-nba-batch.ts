import type { Lead } from "@/lib/leads-store";
import {
  hashRecommendationDedupePart,
  logAiRecommendation,
} from "@/lib/moat-capture/log-ai-recommendation";
import { buildExecutiveSignals } from "@/lib/workdesk/executive-signals";

/** Log top NBA signals once per server request (dedupe_key per lead+action hash). */
export function logNbaRecommendationsForLeads(
  agencyId: string,
  leads: Lead[],
  limit = 3,
): void {
  const signals = buildExecutiveSignals(leads, limit);
  for (const signal of signals) {
    const actionHash = hashRecommendationDedupePart(signal.action);
    logAiRecommendation({
      agencyId,
      leadId: signal.leadId,
      source: "nba",
      recommendation: signal.action,
      reasoning: `${signal.timing} · confidence ${signal.confidence}`,
      confidence: signal.confidence,
      dedupeKey: `nba:${signal.leadId}:${actionHash}`,
      modelVersion: "nba-v1",
    });
  }
}
