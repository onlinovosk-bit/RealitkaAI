// ================================================================
// Revolis.AI — Realvia Queue Processor Cron Endpoint
// GET /api/cron/realvia-process
//
// Called by external cron (Vercel Cron, pg_cron, or manual trigger).
// Authenticated via CRON_SECRET header.
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { processRealviaQueue } from '@/lib/realvia/processQueue';
import { logInfo, logError } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s max for processing

export async function GET(request: NextRequest) {
  try {
    // ── AUTH: Verify cron secret ────────────────────────────────
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const provided = request.headers.get('authorization');
      if (provided !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // ── PROCESS QUEUE ───────────────────────────────────────────
    const startTime = Date.now();
    const result = await processRealviaQueue();
    const duration = Date.now() - startTime;

    logInfo('[realvia-cron] Queue processing complete', {
      ...result,
      durationMs: duration,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      durationMs: duration,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logError('[realvia-cron] Queue processing failed', message);

    return NextResponse.json(
      { error: 'Processing failed', details: message },
      { status: 500 },
    );
  }
}
