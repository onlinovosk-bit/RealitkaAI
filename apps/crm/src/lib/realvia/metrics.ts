import { createServiceRoleClient } from '@/lib/supabase/admin';
import { logError, logInfo } from '@/lib/logger';
import type { RealviaFailureTally } from './failureKinds';

export type RealviaBatchMetricsRecord = Readonly<{
  jobs_processed: number;
  jobs_succeeded: number;
  jobs_failed: number;
  duration_ms: number;
  /**
   * Druh → počet zlyhaní v dávke. Ide do `meta.failures`.
   *
   * Dovtedy sa do `meta` písalo natvrdo `{}`, takže príčina ani jedného
   * z 1 287 zlyhaní (stav 2026-10-18) nebola nikde uložená a analýza mohla
   * skončiť len pri počtoch. `meta` je `jsonb` a existuje — migrácia na toto
   * netreba.
   */
  failures?: RealviaFailureTally;
}>;

/** Persists one row per cron batch for rolling SLI queries (realvia_metrics). */
export async function recordRealviaBatchMetrics(row: RealviaBatchMetricsRecord): Promise<void> {
  const sb = createServiceRoleClient();
  if (!sb) return;

  try {
    const { error } = await sb.from('realvia_metrics').insert({
      source: 'realvia-queue-batch',
      jobs_processed: row.jobs_processed,
      jobs_succeeded: row.jobs_succeeded,
      jobs_failed: row.jobs_failed,
      duration_ms: row.duration_ms,
      meta: buildMetricsMeta(row),
    });

    if (error) {
      logError('[realvia-metrics] Insert failed', error.message);
      return;
    }

    logInfo('[realvia-metrics] Batch metrics recorded', {
      processed: row.jobs_processed,
      succeeded: row.jobs_succeeded,
      failed: row.jobs_failed,
      durationMs: row.duration_ms,
      failures: row.failures ?? {},
    });
  } catch (err) {
    logError('[realvia-metrics] Unexpected insert error', err instanceof Error ? err.message : 'Unknown');
  }
}

/**
 * `meta` pre jeden riadok metrík. Prázdny objekt, keď dávka nič nepokazila —
 * aby sa `meta <> '{}'` dalo použiť ako „táto dávka má zlyhania s príčinou".
 */
export function buildMetricsMeta(row: RealviaBatchMetricsRecord): Record<string, unknown> {
  const failures = row.failures ?? {};
  const kinds = Object.keys(failures);
  if (kinds.length === 0) return {};
  return { failures };
}
