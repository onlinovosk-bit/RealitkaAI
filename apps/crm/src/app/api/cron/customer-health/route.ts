import { NextRequest } from "next/server";
import { errorResponse, okResponse } from "@/lib/api-response";
import { incrementUsageMetric, SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";
import { createAdminClient } from "@/lib/supabase/server";
import {
  persistCustomerHealthDaily,
  scanCustomerHealth,
} from "@/lib/customer-health";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/customer-health — daily silence watchdog for founders.
 * vercel.json: {"path":"/api/cron/customer-health","schedule":"0 7 * * *"} (07:00 UTC).
 * Emits alerts only when severity is orange/red — no "all clear" noise.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) {
    return errorResponse("unauthorized", 401);
  }

  const admin = createAdminClient();
  const checkedAt = new Date();

  try {
    const alerts = await scanCustomerHealth(admin, checkedAt);
    const persist = await persistCustomerHealthDaily(admin, alerts, checkedAt);

    // Founder morning line — only when there is something to report.
    const morningLines =
      alerts.length === 0
        ? []
        : alerts.map(
            (a) =>
              `${a.severity === "red" ? "🔴" : "🟠"} ${a.agencyName}${a.isPaying ? " (platiaci)" : ""}: ${a.signals.map((s) => s.detail).join("; ")}`,
          );

    await incrementUsageMetric({
      agencyId: SYSTEM_USAGE_AGENCY_ID,
      metric: "cron_customer_health",
    });

    return okResponse({
      checkedAt: checkedAt.toISOString(),
      alertCount: alerts.length,
      persist,
      morningLines,
      alerts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "customer_health_failed";
    return errorResponse(message, 500);
  }
}
