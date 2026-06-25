// ================================================================
// Revolis.AI — Realvia Async Processing Worker (L99 Production)
// Dequeues pending jobs, parses payloads, upserts properties,
// detects price changes, handles removals, triggers media sync.
//
// Called by cron endpoint or background task — NOT by webhook.
// ================================================================

import { createServiceRoleClient } from '@/lib/supabase/admin';
import { logInfo, logError, logWarn } from '@/lib/logger';
import {
  fetchPendingJobs,
  fetchWebhookPayload,
  updateQueueJobStatus,
  markWebhookProcessed,
} from './webhookStore';
import { recordRealviaBatchMetrics } from './metrics';
import {
  isAdvertPayload,
  isDeletePayload,
  normalizeRealviaSourceId,
  PROPERTY_STATUS,
} from './types';
import type {
  RealviaWebhookPayload,
  RealviaDeletePayload,
  RealviaProcessingResult,
} from './types';

/** Maximum jobs to process per invocation */
const BATCH_SIZE = 10;
export const REALVIA_PROCESSING_ERROR_AGENCY_RESOLUTION_FAILED = 'Agency resolution failed';

/**
 * Main queue processor — call from cron or API route.
 * Processes up to BATCH_SIZE pending jobs.
 * Returns summary of results.
 */
export async function processRealviaQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  durationMs: number;
  results: RealviaProcessingResult[];
}> {
  const startedAt = Date.now();
  const results: RealviaProcessingResult[] = [];
  let succeeded = 0;
  let failed = 0;

  const jobs = await fetchPendingJobs(BATCH_SIZE);

  if (jobs.length === 0) {
    const durationMs = Date.now() - startedAt;
    logInfo('[realvia-worker] No pending jobs', { durationMs });
    return { processed: 0, succeeded: 0, failed: 0, durationMs, results: [] };
  }

  logInfo('[realvia-worker] Processing batch', { count: jobs.length });

  for (const job of jobs) {
    try {
      // Mark as processing
      await updateQueueJobStatus(job.id, 'processing');

      // Fetch the stored payload
      const webhookData = await fetchWebhookPayload(job.webhook_log_id);

      if (!webhookData) {
        const error = 'Webhook payload not found';
        await updateQueueJobStatus(job.id, 'failed', error);
        await markWebhookProcessed(job.webhook_log_id, error);
        results.push({ success: false, action: 'skipped', error });
        failed++;
        continue;
      }

      const { payload_json: payload, agency_id } = webhookData;

      if (!agency_id) {
        await updateQueueJobStatus(job.id, 'failed', REALVIA_PROCESSING_ERROR_AGENCY_RESOLUTION_FAILED);
        await markWebhookProcessed(job.webhook_log_id, REALVIA_PROCESSING_ERROR_AGENCY_RESOLUTION_FAILED);
        results.push({
          success: false,
          action: 'skipped',
          error: REALVIA_PROCESSING_ERROR_AGENCY_RESOLUTION_FAILED,
        });
        failed++;
        continue;
      }

      // Process based on payload type
      let result: RealviaProcessingResult;

      if (isAdvertPayload(payload)) {
        result = await processAdvertPayload(payload, agency_id);
      } else if (isDeletePayload(payload)) {
        result = await processDeletePayload(
          normalizeRealviaSourceId(payload.source_id),
          agency_id,
          payload.archiveType,
        );
      } else {
        result = {
          success: false,
          action: 'skipped',
          error: 'Unknown payload structure',
        };
      }

      // Update job status
      if (result.success) {
        await updateQueueJobStatus(job.id, 'completed');
        await markWebhookProcessed(job.webhook_log_id);
        succeeded++;
      } else {
        await updateQueueJobStatus(job.id, 'failed', result.error);
        await markWebhookProcessed(job.webhook_log_id, result.error);
        failed++;
      }

      results.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logError('[realvia-worker] Job processing failed', {
        jobId: job.id,
        error: message,
      });

      await updateQueueJobStatus(job.id, 'failed', message);
      await markWebhookProcessed(job.webhook_log_id, message);
      results.push({ success: false, action: 'skipped', error: message });
      failed++;
    }
  }

  logInfo('[realvia-worker] Batch complete', {
    processed: jobs.length,
    succeeded,
    failed,
  });

  const durationMs = Date.now() - startedAt;

  logInfo('[realvia-worker] Cron batch structured summary', {
    jobs_processed: jobs.length,
    jobs_succeeded: succeeded,
    jobs_failed: failed,
    durationMs,
  });

  if (jobs.length > 0) {
    void recordRealviaBatchMetrics({
      jobs_processed: jobs.length,
      jobs_succeeded: succeeded,
      jobs_failed: failed,
      duration_ms: durationMs,
    });
  }

  return {
    processed: jobs.length,
    succeeded,
    failed,
    durationMs,
    results,
  };
}

/**
 * Process a standard advert (create/update) payload.
 * Idempotent: uses source_id for upsert.
 */
async function processAdvertPayload(
  payload: RealviaWebhookPayload,
  agencyId: string | null,
): Promise<RealviaProcessingResult> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return { success: false, action: 'skipped', error: 'DB client unavailable' };
  }

  const { advert, broker } = payload;
  const sourceId = String(advert.source_id);
  const brokerSourceId = String(broker.source_id);

  try {
    // ── Check if property already exists (by source_id) ─────────
    const { data: existing } = await sb
      .from('properties')
      .select('id, price, status')
      .eq('source_id', sourceId)
      .maybeSingle();

    // ── Build property record ───────────────────────────────────
    const propertyData: Record<string, unknown> = {
      source_id: sourceId,
      source_system: 'realvia',
      title: advert.title ?? '',
      description: advert.description ?? '',
      price: advert.price ?? 0,
      currency: mapCurrency(advert.currency),
      type: mapCategory(advert.category),
      transaction_type: mapTransaction(advert.transaction),
      status: PROPERTY_STATUS.ACTIVE,
      location: buildLocationString(advert),
      rooms: advert.rooms_count ? `${advert.rooms_count} izby` : '',
      rooms_count: advert.rooms_count ?? null,
      floor: advert.floor ?? null,
      usable_area: advert.usable_area ?? null,
      building_area: advert.building_area ?? null,
      land_area: advert.land_area ?? null,
      latitude: advert.geo_point?.lat ?? null,
      longitude: advert.geo_point?.lon ?? null,
      images: advert.images ?? [],
      broker_source_id: brokerSourceId,
      broker_name: [broker.degree_before, broker.first_name, broker.last_name, broker.degree_after]
        .filter(Boolean)
        .join(' ')
        .trim(),
      broker_email: broker.email ?? '',
      broker_phone: broker.phone ?? '',
      payload_raw: payload,
      realvia_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      features: mapFeatures(advert),
    };

    if (agencyId) {
      propertyData.agency_id = agencyId;
    }

    let priceChanged = false;

    if (existing) {
      // ── UPDATE existing property ──────────────────────────────
      const oldPrice = existing.price;
      const newPrice = advert.price ?? 0;

      // Detect price change
      if (oldPrice !== null && oldPrice !== newPrice && newPrice > 0) {
        priceChanged = true;
        await recordPriceChange(
          existing.id,
          sourceId,
          oldPrice,
          newPrice,
          mapCurrency(advert.currency),
          agencyId,
        );
      }

      const { error } = await sb
        .from('properties')
        .update(propertyData)
        .eq('id', existing.id);

      if (error) {
        return {
          success: false,
          action: 'updated',
          sourceId: advert.source_id,
          error: error.message,
        };
      }

      logInfo('[realvia-worker] Property updated', {
        propertyId: existing.id,
        sourceId,
        priceChanged,
      });

      return {
        success: true,
        action: 'updated',
        propertyId: existing.id,
        sourceId: advert.source_id,
        priceChanged,
      };
    } else {
      // ── CREATE new property ───────────────────────────────────
      propertyData.id = sourceId; // Use source_id as property ID for simplicity
      propertyData.created_at = new Date().toISOString();

      const { data: inserted, error } = await sb
        .from('properties')
        .insert(propertyData)
        .select('id')
        .single();

      if (error) {
        return {
          success: false,
          action: 'created',
          sourceId: advert.source_id,
          error: error.message,
        };
      }

      // Record initial price
      if (advert.price && advert.price > 0) {
        await recordPriceChange(
          inserted.id,
          sourceId,
          null,
          advert.price,
          mapCurrency(advert.currency),
          agencyId,
        );
      }

      logInfo('[realvia-worker] Property created', {
        propertyId: inserted.id,
        sourceId,
      });

      return {
        success: true,
        action: 'created',
        propertyId: inserted.id,
        sourceId: advert.source_id,
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logError('[realvia-worker] processAdvertPayload failed', {
      sourceId,
      error: message,
    });
    return {
      success: false,
      action: 'skipped',
      sourceId: advert.source_id,
      error: message,
    };
  }
}

/**
 * Process a delete/cancellation payload.
 * NEVER hard-deletes — maps archiveType to property status.
 */
async function processDeletePayload(
  sourceId: string,
  agencyId: string | null,
  archiveType?: RealviaDeletePayload['archiveType'],
): Promise<RealviaProcessingResult> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return { success: false, action: 'skipped', error: 'DB client unavailable' };
  }

  const sourceIdStr = sourceId;

  try {
    const { data: existing } = await sb
      .from('properties')
      .select('id, status')
      .eq('source_id', sourceIdStr)
      .maybeSingle();

    if (!existing) {
      logWarn('[realvia-worker] Delete for unknown property', { sourceId });
      return {
        success: true,
        action: 'skipped',
        sourceId,
        error: 'Property not found — nothing to delete',
      };
    }

    const newStatus =
      archiveType === 'sold'
        ? PROPERTY_STATUS.SOLD
        : archiveType === 'rent'
          ? PROPERTY_STATUS.RENTED
          : PROPERTY_STATUS.REMOVED;

    const { error } = await sb
      .from('properties')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        realvia_updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      return {
        success: false,
        action: 'deleted',
        sourceId,
        propertyId: existing.id,
        error: error.message,
      };
    }

    logInfo('[realvia-worker] Property marked as deleted', {
      propertyId: existing.id,
      sourceId,
      archiveType,
      status: newStatus,
    });

    return {
      success: true,
      action: 'deleted',
      propertyId: existing.id,
      sourceId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logError('[realvia-worker] processDeletePayload failed', {
      sourceId,
      error: message,
    });
    return { success: false, action: 'skipped', sourceId, error: message };
  }
}

// ── HELPER FUNCTIONS ──────────────────────────────────────────────

/**
 * Record a price change in realvia_price_history.
 */
async function recordPriceChange(
  propertyId: string,
  sourceId: string,
  oldPrice: number | null,
  newPrice: number,
  currency: string,
  agencyId: string | null,
): Promise<void> {
  const sb = createServiceRoleClient();
  if (!sb) return;

  try {
    await sb.from('realvia_price_history').insert({
      property_id: propertyId,
      source_id: sourceId,
      old_price: oldPrice,
      new_price: newPrice,
      old_currency: oldPrice !== null ? currency : null,
      new_currency: currency,
      agency_id: agencyId,
    });

    logInfo('[realvia-worker] Price change recorded', {
      propertyId,
      sourceId,
      oldPrice,
      newPrice,
    });
  } catch (err) {
    logError('[realvia-worker] Failed to record price change', {
      propertyId,
      sourceId,
      error: err instanceof Error ? err.message : 'Unknown',
    });
  }
}

/**
 * Build location string from Realvia advert data.
 */
function buildLocationString(advert: RealviaWebhookPayload['advert']): string {
  const parts: string[] = [];
  if (advert.street) parts.push(advert.street);
  // Location IDs would need a lookup table for names — for now, store as-is
  return parts.join(', ') || '';
}

/**
 * Map Realvia category number to our property type.
 * TODO: Populate from Realvia číselníky documentation.
 */
function mapCategory(category: number): string {
  const categoryMap: Record<number, string> = {
    11: 'Byt',
    12: 'Byt',
    13: 'Dom',
    14: 'Dom',
    15: 'Pozemok',
    16: 'Pozemok',
    17: 'Komerčná',
    18: 'Komerčná',
    19: 'Ostatné',
    20: 'Ostatné',
  };
  return categoryMap[category] ?? 'Ostatné';
}

/**
 * Map Realvia transaction number to our transaction type.
 */
function mapTransaction(transaction: number): string {
  const transactionMap: Record<number, string> = {
    123: 'Predaj',
    124: 'Prenájom',
    125: 'Dražba',
  };
  return transactionMap[transaction] ?? 'Predaj';
}

/**
 * Map Realvia currency number to currency code.
 */
function mapCurrency(currency?: number): string {
  const currencyMap: Record<number, string> = {
    167: 'EUR',
    168: 'CZK',
    169: 'USD',
  };
  if (currency === undefined) return 'EUR';
  return currencyMap[currency] ?? 'EUR';
}

/**
 * Extract features from advert for the features[] column.
 */
function mapFeatures(advert: RealviaWebhookPayload['advert']): string[] {
  const features: string[] = [];

  if (advert.extra?.balcony_area && advert.extra.balcony_area > 0) {
    features.push(`Balkón ${advert.extra.balcony_area}m²`);
  }
  if (advert.extra?.loggia_area && advert.extra.loggia_area > 0) {
    features.push(`Loggia ${advert.extra.loggia_area}m²`);
  }
  if (advert.extra?.terrace_area && advert.extra.terrace_area > 0) {
    features.push(`Terasa ${advert.extra.terrace_area}m²`);
  }
  if (advert.extra?.garden_area && advert.extra.garden_area > 0) {
    features.push(`Záhrada ${advert.extra.garden_area}m²`);
  }
  if (advert.extra?.garage_area && advert.extra.garage_area > 0) {
    features.push('Garáž');
  }
  if (advert.extra?.parking_count && advert.extra.parking_count > 0) {
    features.push(`Parkovanie (${advert.extra.parking_count}x)`);
  }
  if (advert.extra?.cellar_area && advert.extra.cellar_area > 0) {
    features.push('Pivnica');
  }

  return features;
}
