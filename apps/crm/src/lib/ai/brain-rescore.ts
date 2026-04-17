import { calculateLeadAiScore } from "@/lib/ai-scoring";
import type { AiEngineSnapshot } from "@/lib/ai/ai-engine-types";
import { generateAISalesBrainProfile } from "@/lib/ai/sales-brain";
import { listPersistedMatches } from "@/lib/matching-store";
import { listOutreachMessages } from "@/lib/outreach-store";
import { listRecommendations } from "@/lib/recommendations-store";
import { listTasks } from "@/lib/tasks-store";

export type { AiEngineSnapshot };

type LeadRow = {
  id: string;
  name: string;
  status: string;
  budget: string;
  location: string;
  propertyType: string;
  rooms: string;
  financing: string;
  timeline: string;
  note: string;
  source: string;
  assignedAgent: string;
  lastContact?: string;
};

/**
 * Načíta kontext a vráti legacy CRM skóre + AI Sales Brain profil (pre zápis do DB).
 */
export async function computeBrainRescorePayload(lead: LeadRow): Promise<{
  legacy: ReturnType<typeof calculateLeadAiScore>;
  brain: ReturnType<typeof generateAISalesBrainProfile>;
  aiEngine: AiEngineSnapshot;
}> {
  const [matches, recommendations, tasks, messages] = await Promise.all([
    listPersistedMatches(),
    listRecommendations(),
    listTasks(),
    listOutreachMessages(),
  ]);

  const legacy = calculateLeadAiScore({
    lead,
    matches,
    recommendations,
    tasks,
    messages,
  });

  const brain = generateAISalesBrainProfile({
    lead,
    matches,
    recommendations,
    tasks,
    messages,
  });

  const aiEngine: AiEngineSnapshot = {
    version: "v2",
    combinedScore: brain.score,
    legacyScore: brain.legacyScore,
    confidence: brain.confidence,
    timeToCloseDays: brain.timeToCloseDays,
    updatedAt: new Date().toISOString(),
  };

  return { legacy, brain, aiEngine };
}
