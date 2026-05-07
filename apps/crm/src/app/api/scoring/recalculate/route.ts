import { NextResponse } from "next/server";
import { okResponse, errorResponse } from "@/lib/api-response";
import {
  recalculateScoringAndRecommendations,
  recalculateSingleLeadScoring,
} from "@/lib/ai-scoring-store";
import { requireFeature } from "@/lib/feature-gating";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

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
