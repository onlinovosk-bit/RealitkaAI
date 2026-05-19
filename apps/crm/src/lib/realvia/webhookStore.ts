// ================================================================
// Revolis.AI — Realvia Webhook Store (L99 Production)
// Raw payload logging + queue management via Supabase service role
// ================================================================

import { createServiceRoleClient } from '@/lib/supabase/admin';
import { logError, logInfo } from '@/lib/logger';
import type { RealviaWebhookLogEntry } from './types';

/**
 * Store raw webhook payload BEFORE any processing.
 * Returns the webhook log ID for queue linking.
 * NEVER throws — graceful fallback on DB failure.
 */
export async function storeWebhookLog(
  entry: RealviaWebhookLogEntry,
): Promise<{ id: string; success: boolean; error?: string }> {
  const sb = createServiceRoleClient();

  if (!sb) {
    logError('[realvia-store] Supabase service role client unavailable');
    return { id: '', success: false, error: 'DB client unavailable' };
  }

  try {
    const { data, error } = await sb
      .from('realvia_webhook_logs')
      .insert({
        request_id: entry.request_id,
        source_ip: entry.source_ip,
        headers_json: entry.headers_json,
        payload_json: entry.payload_json,
        payload_type: entry.payload_type,
        agency_id: entry.agency_id ?? null,
        processed: false,
      })
      .select('id')
      .single();

    if (error) {
      logError('[realvia-store] Failed to store webhook log', error.message);
      return { id: '', success: false, error: error.message };
    }

    logInfo('[realvia-store] Webhook log stored', { id: data.id, requestId: entry.request_id });
    return { id: data.id, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logError('[realvia-store] Unexpected error storing webhook log', message);
    return { id: '', success: false, error: message };
  }
}

/**
 * Enqueue a webhook log for async processing.
 * Creates a pending job in realvia_processing_queue.
 */
export async function enqueueProcessingJob(
  webhookLogId: string,
): Promise<{ id: string; success: boolean; error?: string }> {
  const sb = createServiceRoleClient();

  if (!sb) {
    logError('[realvia-queue] Supabase service role client unavailable');
    return { id: '', success: false, error: 'DB client unavailable' };
  }

  try {
    const { data, error } = await sb
      .from('realvia_processing_queue')
      .insert({
        webhook_log_id: webhookLogId,
        status: 'pending',
        retry_count: 0,
        max_retries: 3,
      })
      .select('id')
      .single();

    if (error) {
      logError('[realvia-queue] Failed to enqueue job', error.message);
      return { id: '', success: false, error: error.message };
    }

    logInfo('[realvia-queue] Job enqueued', { id: data.id, webhookLogId });
    return { id: data.id, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logError('[realvia-queue] Unexpected error enqueuing job', message);
    return { id: '', success: false, error: message };
  }
}

/**
 * Mark webhook log as processed (or failed).
 */
export async function markWebhookProcessed(
  webhookLogId: string,
  error?: string,
): Promise<void> {
  const sb = createServiceRoleClient();
  if (!sb) return;

  try {
    await sb
      .from('realvia_webhook_logs')
      .update({
        processed: !error,
        processing_error: error ?? null,
      })
      .eq('id', webhookLogId);
  } catch (err) {
    logError('[realvia-store] Failed to mark webhook processed', {
      webhookLogId,
      error: err instanceof Error ? err.message : 'Unknown',
    });
  }
}

/**
 * Update queue job status.
 */
export async function updateQueueJobStatus(
  jobId: string,
  status: 'processing' | 'completed' | 'failed',
  errorMessage?: string,
): Promise<void> {
  const sb = createServiceRoleClient();
  if (!sb) return;

  try {
    const update: Record<string, unknown> = { status };

    if (status === 'completed' || status === 'failed') {
      update.processed_at = new Date().toISOString();
    }
    if (errorMessage) {
      update.error_message = errorMessage;
    }
    if (status === 'failed') {
      // Increment retry count and schedule next retry with exponential backoff
      const { data: job } = await sb
        .from('realvia_processing_queue')
        .select('retry_count, max_retries')
        .eq('id', jobId)
        .single();

      if (job) {
        const newRetryCount = (job.retry_count ?? 0) + 1;
        update.retry_count = newRetryCount;

        if (newRetryCount < (job.max_retries ?? 3)) {
          // Exponential backoff: 30s, 2min, 8min
          const delayMs = 30_000 * Math.pow(4, newRetryCount - 1);
          update.next_retry_at = new Date(Date.now() + delayMs).toISOString();
          update.status = 'pending'; // Re-queue for retry
        }
      }
    }

    await sb
      .from('realvia_processing_queue')
      .update(update)
      .eq('id', jobId);
  } catch (err) {
    logError('[realvia-queue] Failed to update job status', {
      jobId,
      status,
      error: err instanceof Error ? err.message : 'Unknown',
    });
  }
}

/**
 * Fetch pending jobs for processing (used by async worker).
 * Returns jobs ordered by creation time, limited to batch size.
 */
export async function fetchPendingJobs(
  batchSize = 10,
): Promise<Array<{ id: string; webhook_log_id: string }>> {
  const sb = createServiceRoleClient();
  if (!sb) return [];

  try {
    const now = new Date().toISOString();

    const { data, error } = await sb
      .from('realvia_processing_queue')
      .select('id, webhook_log_id')
      .or(`status.eq.pending,and(status.eq.failed,next_retry_at.lte.${now})`)
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (error) {
      logError('[realvia-queue] Failed to fetch pending jobs', error.message);
      return [];
    }

    return data ?? [];
  } catch (err) {
    logError('[realvia-queue] Unexpected error fetching jobs', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return [];
  }
}

/**
 * Fetch webhook log payload by ID (for processing).
 */
export async function fetchWebhookPayload(
  webhookLogId: string,
): Promise<{ payload_json: unknown; agency_id: string | null } | null> {
  const sb = createServiceRoleClient();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('realvia_webhook_logs')
      .select('payload_json, agency_id')
      .eq('id', webhookLogId)
      .single();

    if (error) {
      logError('[realvia-store] Failed to fetch webhook payload', error.message);
      return null;
    }

    return data;
  } catch (err) {
    logError('[realvia-store] Unexpected error fetching payload', {
      webhookLogId,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return null;
  }
}

/**
 * Re-queue a stored webhook log (upsert queue row). Resets webhook log processed flags.
 */
export async function enqueueReplayForWebhookLog(
  webhookLogId: string,
): Promise<{ ok: true; queueJobId: string } | { ok: false; error: string }> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return { ok: false, error: 'DB client unavailable' };
  }

  try {
    const { data: logRow, error: logErr } = await sb
      .from('realvia_webhook_logs')
      .select('id')
      .eq('id', webhookLogId)
      .maybeSingle();

    if (logErr || !logRow?.id) {
      return { ok: false, error: 'Webhook log not found' };
    }

    await sb
      .from('realvia_webhook_logs')
      .update({
        processed: false,
        processing_error: null,
      })
      .eq('id', webhookLogId);

    const { data: existingJob } = await sb
      .from('realvia_processing_queue')
      .select('id')
      .eq('webhook_log_id', webhookLogId)
      .maybeSingle();

    if (existingJob?.id) {
      const { error: updErr } = await sb
        .from('realvia_processing_queue')
        .update({
          status: 'pending',
          retry_count: 0,
          max_retries: 3,
          next_retry_at: null,
          processed_at: null,
          error_message: null,
        })
        .eq('id', existingJob.id);

      if (updErr) {
        return { ok: false, error: updErr.message };
      }

      logInfo('[realvia-replay] Existing queue row reset', { webhookLogId, queueJobId: existingJob.id });
      return { ok: true, queueJobId: existingJob.id };
    }

    const { data: inserted, error: insErr } = await sb
      .from('realvia_processing_queue')
      .insert({
        webhook_log_id: webhookLogId,
        status: 'pending',
        retry_count: 0,
        max_retries: 3,
      })
      .select('id')
      .single();

    if (insErr || !inserted?.id) {
      return { ok: false, error: insErr?.message ?? 'Insert failed' };
    }

    logInfo('[realvia-replay] New queue job created', { webhookLogId, queueJobId: inserted.id });
    return { ok: true, queueJobId: inserted.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logError('[realvia-replay] enqueueReplay failed', message);
    return { ok: false, error: message };
  }
}
