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

  const hdr = request.headers.get("x-cron-secret");
  if (hdr !== secret) {
    const url = new URL(request.url);
    const qp = url.searchParams.get("secret");
    if (qp !== secret) {
      return errorResponse("Neautorizované.", 401);
    }
  }

  ensureLearningDataLoaded();
  const result = autoTuneWeights();
  return okResponse({ tuned: result });
}
