import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { listActiveAgencyIds } from "@/lib/ai/dashboard-insights-cron";
import {
  filterAgenciesForGuardianRun,
  isGuardianRunnerEnabled,
} from "@/lib/guardian/config";
import {
  recordGuardianPlatformHeartbeat,
  runGuardianForAgency,
} from "@/lib/guardian/runner";

export const dynamic = "force-dynamic";

/** GET /api/cron/guardian-run — daily Guardian rules R1–R4 (Vercel Hobby cron). */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isGuardianRunnerEnabled()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "runner_disabled" });
  }

  const supabase = createAdminClient();
  const started = Date.now();
  let allAgencyIds: string[] = [];
  try {
    allAgencyIds = await listActiveAgencyIds(supabase);
  } catch (err) {
    const message = err instanceof Error ? err.message : "agencies";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const { ids: agencyIds, skippedReason } = filterAgenciesForGuardianRun(allAgencyIds);

  const results = [];
  let inserted = 0;
  for (const agencyId of agencyIds) {
    try {
      const stats = await runGuardianForAgency(supabase, agencyId);
      inserted += stats.inserted;
      results.push(stats);
    } catch (err) {
      const message = err instanceof Error ? err.message : "guardian run failed";
      results.push({ agencyId, error: message });
    }
  }

  const durationMs = Date.now() - started;
  await recordGuardianPlatformHeartbeat(supabase, {
    agencies: agencyIds.length,
    inserted,
    durationMs,
  });

  return NextResponse.json({
    ok: true,
    agencies: agencyIds.length,
    agenciesListed: allAgencyIds.length,
    skippedReason: skippedReason ?? null,
    inserted,
    durationMs,
    results,
  });
}
