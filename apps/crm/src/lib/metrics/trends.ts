import type { AiCostDailyRow } from "@/lib/metrics/types";

export const TREND_WEEK_COUNT = 4;

/** UTC Monday 00:00 for the week containing `reference`. */
export function weekStartUtc(reference: Date): Date {
  const d = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()),
  );
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

/** Four week buckets ending with the week that contains `asOf` (oldest first). */
export function fourWeekBuckets(asOf: Date): { start: Date; end: Date; label: string }[] {
  const currentStart = weekStartUtc(asOf);
  const buckets: { start: Date; end: Date; label: string }[] = [];

  for (let i = TREND_WEEK_COUNT - 1; i >= 0; i--) {
    const start = new Date(currentStart);
    start.setUTCDate(start.getUTCDate() - i * 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    buckets.push({
      start,
      end,
      label: start.toISOString().slice(0, 10),
    });
  }

  return buckets;
}

export function aggregateAiCostWeek(rows: AiCostDailyRow[], start: Date, end: Date) {
  let creditsSpent = 0;
  let costEur = 0;
  let revenueEurRetail = 0;
  let marginEur = 0;

  for (const row of rows) {
    const day = row.day_utc.slice(0, 10);
    const at = new Date(`${day}T00:00:00.000Z`);
    if (at < start || at >= end) continue;
    creditsSpent += row.credits_spent ?? 0;
    costEur += Number(row.cost_eur ?? 0);
    revenueEurRetail += Number(row.revenue_eur_retail ?? 0);
    marginEur += Number(row.margin_eur ?? 0);
  }

  return {
    creditsSpent,
    costEur: Math.round(costEur * 100) / 100,
    revenueEurRetail: Math.round(revenueEurRetail * 100) / 100,
    marginEur: Math.round(marginEur * 100) / 100,
  };
}

/** Daily ai_cost_daily rows sorted ascending for trend charts / CSV. */
export function sortAiCostDailyAsc(rows: AiCostDailyRow[]): AiCostDailyRow[] {
  return [...rows].sort((a, b) => a.day_utc.localeCompare(b.day_utc));
}
