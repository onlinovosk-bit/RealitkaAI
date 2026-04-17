import { okResponse, errorResponse } from "@/lib/api-response";
import { ensureLearningDataLoaded } from "@/lib/ai/bootstrap-learning";
import { generateAISalesBrainProfile } from "@/lib/ai/sales-brain";
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
    const { id } = await params;
    ensureLearningDataLoaded();

    const userProfile = await getCurrentProfile();
    if (isSupabaseConfigured() && !userProfile) {
      return errorResponse("Neautorizovaný prístup.", 401);
    }

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

    const brainProfile = generateAISalesBrainProfile({
      lead,
      matches,
      recommendations,
      tasks,
      messages,
    });

    return okResponse({ profile: brainProfile });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Sales Brain sa nepodarilo vypočítať.",
      400
    );
  }
}
