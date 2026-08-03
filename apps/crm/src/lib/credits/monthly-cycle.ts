import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  currentPeriodKey,
  previousPeriodKey,
  expireGrantCreditsForAgency,
  grantMonthlyCreditsForAgency,
  type AgencyCreditRow,
} from "@/lib/credits/grant-engine";

const AGENCY_CREDIT_COLUMNS =
  "id, seats, account_tier, grant_credits_balance, purchased_credits_balance, owner_cockpit_active, credits_balance";

export type MonthlyCycleResult = {
  ok: boolean;
  error?: string;
  expire: { periodKey: string; agencies: number; expiredTotal: number; skipped: number };
  grant: { periodKey: string; agencies: number; grantedTotal: number; skipped: number };
};

/**
 * Mesačný kreditový cyklus v JEDNOM behu, s deterministickým poradím:
 *   1. expirácia grantov predchádzajúceho mesiaca
 *   2. grant na aktuálny mesiac
 *
 * Prečo jeden beh a nie dva crony: Vercel Hobby má presnosť plánovania ±59 minút
 * (https://vercel.com/docs/cron-jobs/usage-and-pricing). Pôvodné nastavenie malo
 * credits-expire o 05:00 a credits-grant o 06:00 prvého v mesiaci — pri jitteri
 * na oboch stranách sa poradie mohlo obrátiť, grant by zbehol prvý a expirácia
 * by zmazala práve pridelené kredity. Zákazník by prvého v mesiaci videl nulu.
 *
 * Obe fázy sú idempotentné cez credit_ledger idempotency key, takže opakovaný
 * beh v ten istý deň nič nepokazí.
 *
 * Audit: docs/audit/2026-08-02-profit-leak-audit.md — nález E1
 */
export async function runMonthlyCreditCycle(): Promise<MonthlyCycleResult> {
  const empty = { periodKey: "", agencies: 0, expiredTotal: 0, skipped: 0 };
  const emptyGrant = { periodKey: "", agencies: 0, grantedTotal: 0, skipped: 0 };

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "service_unavailable", expire: empty, grant: emptyGrant };
  }

  // ---- FÁZA 1: expirácia grantov predchádzajúceho mesiaca -------------------
  const expirePeriodKey = previousPeriodKey();
  const { data: toExpire, error: expireErr } = await supabase
    .from("agencies")
    .select(AGENCY_CREDIT_COLUMNS)
    .gt("grant_credits_balance", 0);

  if (expireErr) {
    return { ok: false, error: expireErr.message, expire: empty, grant: emptyGrant };
  }

  let expiredTotal = 0;
  let expireSkipped = 0;
  for (const row of (toExpire ?? []) as AgencyCreditRow[]) {
    const result = await expireGrantCreditsForAgency(row, expirePeriodKey);
    if (result.skipped) expireSkipped += 1;
    else expiredTotal += result.expired;
  }

  // ---- FÁZA 2: grant na aktuálny mesiac ------------------------------------
  // Agentúry sa načítavajú ZNOVA — fáza 1 im zmenila grant_credits_balance.
  const grantPeriodKey = currentPeriodKey();
  const { data: toGrant, error: grantErr } = await supabase
    .from("agencies")
    .select(AGENCY_CREDIT_COLUMNS)
    .gt("seats", 0);

  if (grantErr) {
    return {
      ok: false,
      error: grantErr.message,
      expire: {
        periodKey: expirePeriodKey,
        agencies: toExpire?.length ?? 0,
        expiredTotal,
        skipped: expireSkipped,
      },
      grant: emptyGrant,
    };
  }

  let grantedTotal = 0;
  let grantSkipped = 0;
  for (const row of (toGrant ?? []) as AgencyCreditRow[]) {
    const result = await grantMonthlyCreditsForAgency(row, grantPeriodKey);
    if (result.skipped) grantSkipped += 1;
    else grantedTotal += result.granted;
  }

  return {
    ok: true,
    expire: {
      periodKey: expirePeriodKey,
      agencies: toExpire?.length ?? 0,
      expiredTotal,
      skipped: expireSkipped,
    },
    grant: {
      periodKey: grantPeriodKey,
      agencies: toGrant?.length ?? 0,
      grantedTotal,
      skipped: grantSkipped,
    },
  };
}
