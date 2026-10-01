import { NextRequest } from "next/server";
import { runMonthlyCreditCycle } from "@/lib/credits/monthly-cycle";
import { errorResponse, okResponse } from "@/lib/api-response";
import { incrementUsageMetric, SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";

/**
 * Mesacny kreditovy cyklus — 1. den mesiaca (vercel.json).
 * Nahrádza dvojicu credits-expire + credits-grant, ktorá bežala hodinu po sebe
 * a pri ±59 min jitteri Vercel Hobby sa mohla vykonať v opačnom poradí.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return errorResponse("Unauthorized", 401);
  }

  const result = await runMonthlyCreditCycle();
  if (!result.ok) {
    const status = result.error === "service_unavailable" ? 503 : 500;
    return errorResponse(result.error ?? "Monthly credit cycle failed", status, {
      expire: result.expire,
      grant: result.grant,
    });
  }

  await incrementUsageMetric({
    agencyId: SYSTEM_USAGE_AGENCY_ID,
    metric: "cron_credits_cycle",
  });

  return okResponse(result);
}
