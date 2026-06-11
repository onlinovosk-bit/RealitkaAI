import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  currentPeriodKey,
  grantMonthlyCreditsForAgency,
  type AgencyCreditRow,
} from "@/lib/credits/grant-engine";

/** Mesačný grant — 1. deň mesiaca (vercel.json). */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service role unavailable" }, { status: 503 });
  }

  const periodKey = currentPeriodKey();
  const { data: agencies, error } = await supabase
    .from("agencies")
    .select(
      "id, seats, account_tier, grant_credits_balance, purchased_credits_balance, owner_cockpit_active, credits_balance",
    )
    .gt("seats", 0);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let grantedTotal = 0;
  let skipped = 0;

  for (const row of (agencies ?? []) as AgencyCreditRow[]) {
    const result = await grantMonthlyCreditsForAgency(row, periodKey);
    if (result.skipped) skipped += 1;
    else grantedTotal += result.granted;
  }

  return NextResponse.json({
    ok: true,
    periodKey,
    agencies: agencies?.length ?? 0,
    grantedTotal,
    skipped,
  });
}
