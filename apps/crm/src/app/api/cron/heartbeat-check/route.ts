import { NextRequest, NextResponse } from "next/server";
import { runPlatformHeartbeat } from "@/lib/infra/platform-heartbeat";
import { SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/cron/heartbeat-check — P4 platform heartbeat (cron daily). */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const result = await runPlatformHeartbeat({
    supabase,
    notifyAgencyId: SYSTEM_USAGE_AGENCY_ID,
    agencyScope: null,
    notify: true,
  });

  const status = result.ok ? 200 : 503;
  return NextResponse.json(result, { status });
}
