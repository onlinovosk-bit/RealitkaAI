import { NextRequest } from "next/server";
import { errorResponse, okResponse } from "@/lib/api-response";
import { incrementUsageMetric, SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";
import { runGmailInboundPull } from "@/lib/inbound/gmail-pull";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) {
    return errorResponse("unauthorized", 401);
  }

  await incrementUsageMetric({
    agencyId: SYSTEM_USAGE_AGENCY_ID,
    metric: "ai_openai_tokens",
    delta: 0,
  });

  const result = await runGmailInboundPull({ fetch });
  if (!result.ok) {
    return errorResponse(result.error, 503);
  }
  return okResponse(result);
}

export const GET = handle;
export const POST = handle;
