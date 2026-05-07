/**
 * POST /api/cron/auto-tune — upraví váhy podľa uložených outcomes.
 * Volajte z cron (GitHub Actions), nie publikujte URL bez tajomstva.
 */
export const runtime = "nodejs";

import { autoTuneWeights } from "@/lib/ai/auto-tune";
import { ensureLearningDataLoaded } from "@/lib/ai/bootstrap-learning";
import { errorResponse, okResponse } from "@/lib/api-response";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return errorResponse("CRON_SECRET nie je nastavený.", 503);
  }

  if (request.headers.get("x-cron-secret") !== secret) {
    return errorResponse("Neautorizované.", 401);
  }

  try {
    ensureLearningDataLoaded();
    const result = autoTuneWeights();
    return okResponse({ tuned: result });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "auto-tune zlyhal.",
      500
    );
  }
}
