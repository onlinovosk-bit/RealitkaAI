import { createServiceRoleClient } from '@/lib/supabase/admin';
import { logError, logInfo } from '@/lib/logger';

export type RealviaBatchMetricsRecord = Readonly<{
  jobs_processed: number;
  jobs_succeeded: number;
  jobs_failed: number;
  duration_ms: number;
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
      meta: {},
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
    });
  } catch (err) {
    logError('[realvia-metrics] Unexpected insert error', err instanceof Error ? err.message : 'Unknown');
  }
}
