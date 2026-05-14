import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { assertRealviaAdminApi } from '@/lib/realvia/adminAuth';
import { logError } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_WINDOW_H = 168;

/** Rolling aggregates from realvia_metrics (cron batch inserts). */
export async function GET(request: NextRequest) {
  const gate = await assertRealviaAdminApi();
  if (gate instanceof NextResponse) return gate;

  const rawHours = request.nextUrl.searchParams.get('hours')?.trim() ?? '24';
  let hours = Number.parseFloat(rawHours);
  if (!Number.isFinite(hours) || hours <= 0) hours = 24;
  hours = Math.min(MAX_WINDOW_H, Math.max(1, hours));

  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json({ error: 'Service role unavailable' }, { status: 503 });
  }

  try {
    const { data: rows, error } = await sb
      .from('realvia_metrics')
      .select('jobs_processed, jobs_succeeded, jobs_failed, duration_ms')
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: false });

    if (error) {
      logError('[realvia-metrics-api] Query failed', error.message);
      return NextResponse.json(
        {
          error: error.message,
          hint: 'Run migration 20260512103000_realvia_agency_credentials_metrics.sql if table missing',
        },
        { status: 502 },
      );
    }

    let jobsProcessed = 0;
    let jobsSucceeded = 0;
    let jobsFailed = 0;
    let durationMsSum = 0;

    for (const r of rows ?? []) {
      jobsProcessed += Number(r.jobs_processed) || 0;
      jobsSucceeded += Number(r.jobs_succeeded) || 0;
      jobsFailed += Number(r.jobs_failed) || 0;
      durationMsSum += Number(r.duration_ms) || 0;
    }

    const batchCount = (rows ?? []).length;
    const finishedLike = jobsSucceeded + jobsFailed;
    const errorRate =
      finishedLike > 0 ? Math.round((jobsFailed / finishedLike + Number.EPSILON) * 10_000) / 10_000 : null;

    return NextResponse.json({
      window_hours: hours,
      batch_rows: batchCount,
      jobs_processed_in_batches: jobsProcessed,
      jobs_succeeded: jobsSucceeded,
      jobs_failed: jobsFailed,
      error_rate_where_finished:
        typeof errorRate === 'number'
          ? errorRate
          : null /* no jobs finished in recorded batches */,
      avg_batch_duration_ms: batchCount ? Math.round(durationMsSum / batchCount) : null,
      source: 'realvia_metrics table + structured logs tagged [realvia-worker]',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
