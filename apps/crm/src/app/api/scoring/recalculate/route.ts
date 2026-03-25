import { okResponse, errorResponse } from "@/lib/api-response";
import {
  recalculateScoringAndRecommendations,
  recalculateSingleLeadScoring,
} from "@/lib/ai-scoring-store";
import { requireFeature } from "@/lib/feature-gating";

export async function POST(request: Request) {
  try {
    await requireFeature("aiScoring");

    const body = await request.json().catch(() => ({}));
    const leadId = body?.leadId as string | undefined;

    if (leadId) {
      const result = await recalculateSingleLeadScoring(leadId);
      return okResponse({ mode: "single", result });
    }

    const result = await recalculateScoringAndRecommendations();
    return okResponse({ mode: "all", result });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa prepočítať AI scoring.",
      400
    );
  }
}
