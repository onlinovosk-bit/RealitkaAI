// ================================================================
// Revolis.AI — Realvia Queue Worker Cron Endpoint
// Drains realvia_processing_queue (webhook enqueues, worker processes).
//
// Schedule: every 5 minutes via EXTERNAL cron (cron-job.org, Upstash, etc.)
// Do NOT add */5 to vercel.json on Hobby — Vercel blocks sub-hourly crons.
//
// Trigger: GET https://app.revolis.ai/api/cron/realvia-process
// Auth: Authorization: Bearer $CRON_SECRET
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { processRealviaQueue } from '@/lib/realvia/processQueue';
import { enqueueReplayFailedQueueJobs } from '@/lib/realvia/webhookStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const replayFailedParam = request.nextUrl.searchParams.get('replay_failed');
    const replayFailed =
      replayFailedParam === '1' ||
      replayFailedParam === 'true' ||
      replayFailedParam === 'yes' ||
      replayFailedParam === 'on';
    const replayLimitRaw = Number(request.nextUrl.searchParams.get('replay_limit') ?? '50');
    const replayLimit = Number.isFinite(replayLimitRaw) ? replayLimitRaw : 50;

    let replayResult: { replayedCount: number; errors: string[] } | null = null;
    if (replayFailed) {
      replayResult = await enqueueReplayFailedQueueJobs(replayLimit);
    }

    const result = await processRealviaQueue();
    return NextResponse.json({
      ok: true,
      ...result,
      ...(replayResult ? { replay_failed_jobs: replayResult } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Worker failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
