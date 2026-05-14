import { NextResponse } from 'next/server';
import { assertRealviaAdminApi } from '@/lib/realvia/adminAuth';
import { processRealviaQueue } from '@/lib/realvia/processQueue';
import { logError } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Same workload as cron but gated by authenticated admin — UI can invoke without CRON_SECRET. */
export async function POST() {
  const gate = await assertRealviaAdminApi();
  if (gate instanceof NextResponse) return gate;

  try {
    const result = await processRealviaQueue();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    logError('[realvia-admin-run-worker]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
