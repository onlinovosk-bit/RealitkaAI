import { generateAISalesBrainProfile } from "@/lib/ai/sales-brain";
import { getLead } from "@/lib/leads-store";
import { listPersistedMatches } from "@/lib/matching-store";
import { listOutreachMessages } from "@/lib/outreach-store";
import { listRecommendations } from "@/lib/recommendations-store";
import { listTasks } from "@/lib/tasks-store";
import { executeAutopilotAction } from "./action-executor";
import { getAutopilotActions } from "./autopilot-rules";
import type { ActionExecutionResult } from "./action-executor";

export type AutopilotRunResult = {
  leadId: string;
  profile: ReturnType<typeof generateAISalesBrainProfile>;
  actions: ReturnType<typeof getAutopilotActions>;
  results: ActionExecutionResult[];
};

/**
 * Spustí pipeline: signály → scoring/brain → pravidlá → vykonanie akcií.
 */
export async function runAutopilotForLead(leadId: string): Promise<AutopilotRunResult> {
  const lead = await getLead(leadId);
  if (!lead) {
    throw new Error("Lead sa nenašiel.");
  }

  const [matches, recommendations, tasks, messages] = await Promise.all([
    listPersistedMatches(),
    listRecommendations(),
    listTasks(),
    listOutreachMessages(),
  ]);

  const profile = generateAISalesBrainProfile({
    lead,
    matches,
    recommendations,
    tasks,
    messages,
  });

  const actions = getAutopilotActions(profile);
  const results: ActionExecutionResult[] = [];

  for (const action of actions) {
    const r = await executeAutopilotAction(action, lead);
    results.push(r);
  }

  return { leadId, profile, actions, results };
}
