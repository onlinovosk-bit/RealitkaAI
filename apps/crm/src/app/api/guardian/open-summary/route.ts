import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GUARDIAN_FINDINGS_TABLE, GUARDIAN_RUNNER_NOTIFICATION_TYPE } from "@/lib/guardian/config";
import { resolveProfileForAuthUser } from "@/lib/profiles/resolve-profile-for-auth";
import type { GuardianRuleCode } from "@/lib/guardian/types";

export const dynamic = "force-dynamic";

/** GET /api/guardian/open-summary — open finding counts for insights badge (tenant-scoped). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await resolveProfileForAuthUser(supabase, user.id);
  const agencyId = profile?.agency_id;
  if (!agencyId) {
    return NextResponse.json({ error: "No agency" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from(GUARDIAN_FINDINGS_TABLE)
    .select("rule_code")
    .eq("agency_id", agencyId)
    .is("resolved_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byRule: Record<GuardianRuleCode, number> = {
    STALE: 0,
    NO_OWNER: 0,
    NO_PHONE: 0,
    HOT_IGNORED: 0,
  };
  for (const row of data ?? []) {
    const code = String(row.rule_code) as GuardianRuleCode;
    if (code in byRule) byRule[code] += 1;
  }
  const openTotal = (data ?? []).length;

  const { data: lastRunRow } = await supabase
    .from("routine_notifications")
    .select("created_at, data")
    .eq("agency_id", agencyId)
    .eq("type", GUARDIAN_RUNNER_NOTIFICATION_TYPE)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    openTotal,
    byRule,
    lastRunAt: lastRunRow?.created_at ?? null,
    lastRunMeta: lastRunRow?.data ?? null,
  });
}
