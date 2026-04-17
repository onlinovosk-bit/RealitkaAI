/** Persistovaný snapshot AI Sales Brain (JSON stĺpec ai_engine). */
export type AiEngineSnapshot = {
  version: "v2";
  combinedScore: number;
  legacyScore: number;
  confidence: number;
  timeToCloseDays: number;
  updatedAt: string;
};
