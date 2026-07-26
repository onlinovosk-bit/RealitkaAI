export function isMoatCaptureEnabled(): boolean {
  const raw = process.env.CAPTURE_ENABLED;
  if (raw === undefined || raw === "") return true;
  const normalized = raw.trim().toLowerCase();
  return normalized !== "false" && normalized !== "0" && normalized !== "off";
}

/** Table for AI capture logs (brief name: ai_recommendations — see build package ODCHÝLKY). */
export const MOAT_AI_RECOMMENDATIONS_TABLE = "moat_ai_recommendations" as const;

export const DEAL_OUTCOMES_TABLE = "deal_outcomes" as const;
