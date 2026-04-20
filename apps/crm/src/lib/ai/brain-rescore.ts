export type BrainRescorePayload = {
  legacy: { score: number };
  aiEngine: { combinedScore: number; confidence: number };
};

export async function computeBrainRescorePayload(
  lead: Record<string, unknown>
): Promise<BrainRescorePayload> {
  // Základný scoring podľa dostupných polí
  const score = typeof lead.score === "number" ? lead.score : 50;

  return {
    legacy: { score },
    aiEngine: { combinedScore: score, confidence: 0.7 },
  };
}
