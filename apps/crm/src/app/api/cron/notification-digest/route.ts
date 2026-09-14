import { NextRequest } from "next/server";
import { errorResponse, okResponse } from "@/lib/api-response";
import { runUnreadNotificationDigest } from "@/lib/infra/notification-delivery";
import { createAdminClient } from "@/lib/supabase/server";
import { incrementUsageMetric, SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/notification-digest — Strážca prítoku daily delivery.
 * Unread routine_notifications → FOUNDER_EMAILS; mark read_at after send.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const supabase = createAdminClient();
    const result = await runUnreadNotificationDigest(supabase);

    await incrementUsageMetric({
      agencyId: SYSTEM_USAGE_AGENCY_ID,
      metric: "cron_notification_digest",
    });

    return okResponse({
      ...result,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "notification_digest_failed";
    return errorResponse(message, 500);
  }
}
