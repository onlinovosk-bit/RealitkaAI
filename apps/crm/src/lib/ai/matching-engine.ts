import { createActivity } from "@/lib/activities-store";
import { recalculateAllMatches } from "@/lib/matching-store";
import { emitPlatformEventServer } from "@/lib/platform-events-server";
import { incrementUsageMetric, SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";

export type DailyMatchRunResult = Awaited<ReturnType<typeof recalculateAllMatches>>;

/**
 * Denný AI matching – prepočíta zhody lead ↔ nehnuteľnosť a zapíše audit aktivitu.
 * Volané z cron route alebo manuálne z admin nástrojov.
 */
export async function runAImatching(): Promise<{
  ok: true;
  result: DailyMatchRunResult;
}> {
  const result = await recalculateAllMatches();

  try {
    await createActivity({
      leadId: null,
      type: "Matching",
      title: "Denná analýza trhu – AI matching",
      text: `Automatický prepočet zhôd dokončený. Zapísaných riadkov: ${result.totalRows}.`,
      entityType: "matching",
      entityId: "daily-cron",
      actorName: "Revolis AI",
      source: "matching",
      severity: "info",
      meta: result,
    });
  } catch {
    /* aktivita je best-effort */
  }

  await emitPlatformEventServer({
    agencyId: null,
    eventType: "system.cron.daily_match",
    payload: {
      totalRows: result.totalRows,
      totalLeads: result.totalLeads,
      totalProperties: result.totalProperties,
      at: new Date().toISOString(),
    },
  });

  await incrementUsageMetric({
    agencyId: SYSTEM_USAGE_AGENCY_ID,
    metric: "cron_daily_match",
    delta: 1,
  });

  return { ok: true, result };
}
