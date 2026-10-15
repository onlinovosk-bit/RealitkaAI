// ================================================================
// Revolis.AI — Realvia Queue Worker Cron Endpoint
// Drains realvia_processing_queue (webhook enqueues, worker processes).
//
// ROZVRH (bod 4, 2026-10-15): `50 11 * * *` vo `vercel.json`, teda raz denne.
// Predtým tu stálo „každých 5 minút cez EXTERNÝ cron" — taký cron ale
// nebežal. Zmerané na PROD 2026-10-15 z `realvia_metrics`: za posledných
// 21 dní beh prebehol iba v 7 dňoch (spolu 24 behov), a úloha vo fronte
// čakala na spracovanie v priemere ~2 dni, najdlhšie 28 dní.
//
// Prečo denne a nie častejšie: Vercel build odmietol hodinový výraz slovami
// „Hobby accounts are limited to daily cron jobs" a zhodil celý deployment,
// nielen ten cron. Je to hranica účtu, nie voľba. Oproti „7 z 21 dní" je aj
// denný rozvrh rádový rozdiel; častejšie chce plán Pro alebo vlastný plánovač.
//
// Beh po sebe od 2026-10-15 nechá riadok v `cron_runs` (job `realvia-process`),
// vrátane odmietnutia na autorizácii, keď prišiel Vercel cron. Prázdna fronta
// sa zapisuje zastropovane, aby z denníka nebola skládka.
//
// Trigger: GET https://app.revolis.ai/api/cron/realvia-process
// Auth: Authorization: Bearer $CRON_SECRET
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { processRealviaQueue } from '@/lib/realvia/processQueue';
import { enqueueReplayFailedQueueJobs } from '@/lib/realvia/webhookStore';
import { reconcileWebhookProcessedFlags } from '@/lib/realvia/reconcileWebhookProcessed';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import {
  callerUserAgent,
  cronHttpStatus,
  deriveCronStatus,
  recordCronRun,
  recordSkippedCronRun,
  recordUnauthorizedCronRun,
  vercelCronSchedule,
} from '@/lib/ops/cron-run';

const JOB = 'realvia-process';
/** Prázdna fronta je normálny stav; stačí vedieť, že sa beží. */
const EMPTY_QUEUE_LOG_INTERVAL_MS = 6 * 60 * 60 * 1000;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startedAt = new Date();
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    // CRON-ALIVE: 401 nastáva pred akýmkoľvek zápisom, takže bez tohto riadku
    // je „Vercel cron neprišiel" nerozlíšiteľné od „prišiel a CRON_SECRET nesedí".
    const schedule = vercelCronSchedule(request.headers);
    if (schedule) {
      const admin = createServiceRoleClient();
      if (admin) {
        await recordUnauthorizedCronRun(admin, JOB, schedule, callerUserAgent(request.headers));
      }
    }
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

    const reconcileParam = request.nextUrl.searchParams.get('reconcile_processed');
    const runReconcile =
      reconcileParam === '1' ||
      reconcileParam === 'true' ||
      reconcileParam === 'yes' ||
      reconcileParam === 'on';

    let reconcileResult = null;
    if (runReconcile) {
      reconcileResult = await reconcileWebhookProcessedFlags({ limit: 200 });
    }

    const result = await processRealviaQueue();

    const admin = createServiceRoleClient();
    let logError: string | null = null;
    const status = deriveCronStatus(result.processed, result.succeeded, result.failed);
    if (admin) {
      if (result.processed === 0 && !replayResult && !reconcileResult) {
        // Prázdna fronta: zapíše sa najviac raz za 6 hodín. Bez zápisu by sa
        // nedalo odlíšiť „nič nečakalo" od „cron vôbec neprišiel".
        await recordSkippedCronRun(admin, JOB, 'empty_queue', {
          minIntervalMs: EMPTY_QUEUE_LOG_INTERVAL_MS,
          startedAt,
        });
      } else {
        logError = await recordCronRun(admin, {
          job: JOB,
          status,
          scanned: result.processed,
          eligible: result.processed,
          written: result.succeeded,
          failed: result.failed,
          firstError: result.results.find((r) => !r.success)?.error ?? null,
          detail: {
            duration_ms: result.durationMs,
            ...(replayResult ? { replayed: replayResult.replayedCount } : {}),
            ...(reconcileResult ? { reconciled: true } : {}),
          },
          startedAt,
        });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        ...result,
        ...(replayResult ? { replay_failed_jobs: replayResult } : {}),
        ...(reconcileResult ? { reconcile_processed: reconcileResult } : {}),
      },
      { status: cronHttpStatus(status, logError) },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Worker failed';
    const admin = createServiceRoleClient();
    if (admin) {
      await recordCronRun(admin, {
        job: JOB,
        status: 'failed',
        failed: 1,
        firstError: message,
        startedAt,
      });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
