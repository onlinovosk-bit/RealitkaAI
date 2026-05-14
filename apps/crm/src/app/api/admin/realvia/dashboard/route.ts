import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { assertRealviaAdminApi } from '@/lib/realvia/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reads Realvia ingest tables through service-role (not browser anon RLS blind spot).
 */
export async function GET() {
  const gate = await assertRealviaAdminApi();
  if (gate instanceof NextResponse) return gate;

  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json({ error: 'Service role unavailable' }, { status: 503 });
  }

  try {
    const [logsResult, jobsResult] = await Promise.all([
      sb
        .from('realvia_webhook_logs')
        .select(
          'id, request_id, received_at, source_ip, payload_type, processed, processing_error, agency_id',
        )
        .order('received_at', { ascending: false })
        .limit(50),
      sb
        .from('realvia_processing_queue')
        .select(
          'id, webhook_log_id, status, retry_count, max_retries, created_at, processed_at, error_message',
        )
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (logsResult.error) {
      return NextResponse.json(
        {
          error: logsResult.error.message,
          hint: 'Table missing? Apply 22_realvia_webhook_infrastructure.sql via migrations + Supabase migrate',
        },
        { status: 502 },
      );
    }

    if (jobsResult.error) {
      return NextResponse.json({ error: jobsResult.error.message }, { status: 502 });
    }

    const logs = logsResult.data ?? [];
    const jobs = jobsResult.data ?? [];

    const stats = {
      totalLogs: logs.length,
      processedLogs: logs.filter((l) => l.processed).length,
      pendingJobs: jobs.filter((j) => j.status === 'pending').length,
      failedJobs: jobs.filter((j) => j.status === 'failed').length,
      completedJobs: jobs.filter((j) => j.status === 'completed').length,
    };

    return NextResponse.json({
      logs,
      jobs,
      stats,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
