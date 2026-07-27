import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { listActiveAgencyIds } from "@/lib/ai/dashboard-insights-cron";
import { filterAgenciesForGuardianRun } from "@/lib/guardian/config";
import { runGuardianDigestForAgency } from "@/lib/guardian/digest";

export const dynamic = "force-dynamic";

/** GET /api/cron/guardian-digest — daily digest (07:00), no PII; GUARDIAN_DIGEST_ENABLED gate. */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  let allAgencyIds: string[] = [];
  try {
    allAgencyIds = await listActiveAgencyIds(supabase);
  } catch (err) {
    const message = err instanceof Error ? err.message : "agencies";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const { ids: agencyIds } = filterAgenciesForGuardianRun(allAgencyIds);

  const outcomes = [];
  for (const agencyId of agencyIds) {
    const result = await runGuardianDigestForAgency(supabase, agencyId);
    outcomes.push({ agencyId, ...result });
  }

  return NextResponse.json({
    ok: true,
    agencies: agencyIds.length,
    outcomes,
    generated_at: new Date().toISOString(),
  });
}
