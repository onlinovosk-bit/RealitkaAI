import { okResponse, errorResponse } from "@/lib/api-response";
import { ensureLearningDataLoaded } from "@/lib/ai/bootstrap-learning";
import { generateAISalesBrainProfile } from "@/lib/ai/sales-brain";
import {
  generateDealStrategy,
  prioritizeSteps,
  strategyCloseProbability,
} from "@/lib/ai/deal-strategy";
import { getCurrentProfile } from "@/lib/auth";
import { getLead, isSupabaseConfigured } from "@/lib/leads-store";
import { listPersistedMatches } from "@/lib/matching-store";
import { listOutreachMessages } from "@/lib/outreach-store";
import { listRecommendations } from "@/lib/recommendations-store";
import { listTasks } from "@/lib/tasks-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userProfile = await getCurrentProfile();
    if (isSupabaseConfigured() && !userProfile) {
      return errorResponse("Neautorizovaný prístup.", 401);
    }

    const { id } = await params;
    ensureLearningDataLoaded();

    const lead = await getLead(id);
    if (!lead) {
      return errorResponse("Lead sa nenašiel.", 404);
    }

    const [matches, recommendations, tasks, messages] = await Promise.all([
      listPersistedMatches(),
      listRecommendations(),
      listTasks(),
      listOutreachMessages(),
    ]);

    const brain = generateAISalesBrainProfile({
      lead,
      matches,
      recommendations,
      tasks,
      messages,
    });

    const strategyInput = {
      score: brain.score,
      status: lead.status,
      note: lead.note,
      financing: lead.financing,
      timeline: lead.timeline,
      timeToCloseDays: brain.timeToCloseDays,
    };

    const allSteps = generateDealStrategy(strategyInput);
    const topSteps = prioritizeSteps(allSteps, 3);
    const closeProbability = strategyCloseProbability(strategyInput);

    return okResponse({
      leadId: id,
      leadName: lead.name,
      strategyInput,
      allSteps,
      topSteps,
      closeProbability,
      brainScore: brain.score,
      timeToCloseDays: brain.timeToCloseDays,
    });
  } catch (e) {
    return errorResponse(
      e instanceof Error ? e.message : "Stratégia sa nepodarila vypočítať.",
      400
    );
  }
}
