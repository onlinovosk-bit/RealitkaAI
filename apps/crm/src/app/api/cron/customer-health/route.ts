import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  persistCustomerHealthDaily,
  scanCustomerHealth,
} from "@/lib/customer-health";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/customer-health — daily silence watchdog for founders.
 * Schedule (founder): add to vercel.json → "0 7 * * *" (07:00 UTC ≈ morning report).
 * Emits alerts only when severity is orange/red — no "all clear" noise.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
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

    return NextResponse.json({
      ok: true,
      checkedAt: checkedAt.toISOString(),
      alertCount: alerts.length,
      persist,
      morningLines,
      alerts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "customer_health_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
