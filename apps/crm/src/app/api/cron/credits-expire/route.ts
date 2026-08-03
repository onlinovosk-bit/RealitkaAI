import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  previousPeriodKey,
  expireGrantCreditsForAgency,
  type AgencyCreditRow,
} from "@/lib/credits/grant-engine";

/** Month-end sweep grant kreditov — posledný deň mesiaca (vercel.json). */
/**
 * @deprecated Od 2026-08-02 už nie je v vercel.json. Mesačný cyklus beží ako jeden
 * atomický krok v /api/cron/credits-cycle (expirácia -> grant, deterministické poradie).
 * Dôvod: Vercel Hobby má presnosť plánovania ±59 min, takže dva crony hodinu po sebe
 * sa mohli vykonať v opačnom poradí a grant by bol okamžite expirovaný.
 * Route je ponechaná ako ručný nástroj — je idempotentná cez credit_ledger.
 * Audit: docs/audit/2026-08-02-profit-leak-audit.md — nález E1
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service role unavailable" }, { status: 503 });
  }

  // 1. deň mesiaca: expiruj granty predchádzajúceho mesiaca
  const periodKey = previousPeriodKey();
  const { data: agencies, error } = await supabase
    .from("agencies")
    .select(
      "id, seats, account_tier, grant_credits_balance, purchased_credits_balance, owner_cockpit_active, credits_balance",
    )
    .gt("grant_credits_balance", 0);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let expiredTotal = 0;
  let skipped = 0;

  for (const row of (agencies ?? []) as AgencyCreditRow[]) {
    const result = await expireGrantCreditsForAgency(row, periodKey);
    if (result.skipped) skipped += 1;
    else expiredTotal += result.expired;
  }

  return NextResponse.json({
    ok: true,
    periodKey,
    agencies: agencies?.length ?? 0,
    expiredTotal,
    skipped,
  });
}
