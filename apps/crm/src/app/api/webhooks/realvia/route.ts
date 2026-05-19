// ================================================================
// Revolis.AI — Realvia Webhook Endpoint (L99 Production)
// POST /api/webhooks/realvia
//
// CRITICAL RULES:
// 1. Validate → Log → Enqueue → Return 200. Nothing else.
// 2. NO AI, NO image download, NO heavy processing.
// 3. Response MUST be < 300ms.
// 4. NEVER crash — always return a response.
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/realvia/validate';
import { resolveAgencyIdFromRealviaHeaders } from '@/lib/realvia/resolveAgency';
import { storeWebhookLog, enqueueProcessingJob } from '@/lib/realvia/webhookStore';
import { isAdvertPayload, isDeletePayload } from '@/lib/realvia/types';
import type { RealviaWebhookLogEntry } from '@/lib/realvia/types';
import { logInfo, logError, logWarn } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let requestId = crypto.randomUUID();

  try {
    // ── 1. SECURITY VALIDATION ──────────────────────────────────
    const validation = validateRequest(request);

    if (!validation.valid) {
      logWarn('[realvia-webhook] Request rejected', {
        ip: validation.ip,
        errors: validation.errors,
      });

      return NextResponse.json(
        { error: 'Forbidden', details: validation.errors },
        { status: 403 },
      );
    }

    // ── 2. PARSE JSON BODY ──────────────────────────────────────
    let payload: unknown;
    try {
      const text = await request.text();

      // Double-check payload size after reading
      if (text.length > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Payload too large' },
          { status: 413 },
        );
      }

      payload = JSON.parse(text);
    } catch {
      logWarn('[realvia-webhook] Invalid JSON body', { ip: validation.ip });
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 },
      );
    }

    // ── 3. DETERMINE PAYLOAD TYPE ───────────────────────────────
    let payloadType: 'advert' | 'delete' | 'unknown' = 'unknown';

    if (isAdvertPayload(payload)) {
      payloadType = 'advert';
    } else if (isDeletePayload(payload)) {
      payloadType = 'delete';
    } else {
      logWarn('[realvia-webhook] Unknown payload structure', {
        ip: validation.ip,
        keys: payload && typeof payload === 'object' ? Object.keys(payload) : [],
      });
    }

    // ── 4. EXTRACT HEADERS FOR LOGGING ──────────────────────────
    const headersMap: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Redact sensitive headers
      if (key.toLowerCase() === 'x-revolis-secret' || key.toLowerCase().includes('password')) {
        headersMap[key] = '[REDACTED]';
      } else {
        headersMap[key] = value;
      }
    });

    const identifikatorRaw = request.headers.get('identifikator') ?? '';
    const identifikator2Raw = request.headers.get('identifikator2') ?? '';

    const agencyId = await resolveAgencyIdFromRealviaHeaders(
      identifikatorRaw,
      identifikator2Raw,
    );

    // ── 5. STORE RAW PAYLOAD ────────────────────────────────────
    const logEntry: RealviaWebhookLogEntry = {
      request_id: requestId,
      source_ip: validation.ip,
      headers_json: headersMap,
      payload_json: payload,
      payload_type: payloadType,
      agency_id: agencyId ?? undefined,
    };

    const storeResult = await storeWebhookLog(logEntry);

    if (!storeResult.success) {
      // DB failure — still return 200 to prevent Realvia retries
      // but log critical error
      logError('[realvia-webhook] CRITICAL: Failed to store webhook log', {
        requestId,
        error: storeResult.error,
      });

      // Return 500 so Realvia knows to retry
      return NextResponse.json(
        { error: 'Internal storage error', request_id: requestId },
        { status: 500 },
      );
    }

    // ── 6. ENQUEUE FOR ASYNC PROCESSING ─────────────────────────
    const queueResult = await enqueueProcessingJob(storeResult.id);

    if (!queueResult.success) {
      logError('[realvia-webhook] Failed to enqueue job (payload still stored)', {
        webhookLogId: storeResult.id,
        error: queueResult.error,
      });
      // Payload is stored — can be replayed later. Still return 200.
    }

    // ── 7. SUCCESS RESPONSE ─────────────────────────────────────
    const duration = Date.now() - startTime;

    logInfo('[realvia-webhook] Request processed', {
      requestId,
      payloadType,
      agencyId,
      ip: validation.ip,
      webhookLogId: storeResult.id,
      queueJobId: queueResult.id,
      durationMs: duration,
    });

    return NextResponse.json(
      {
        ok: true,
        request_id: requestId,
        payload_type: payloadType,
        queued: queueResult.success,
      },
      { status: 200 },
    );
  } catch (err) {
    // ── CATCH-ALL: NEVER CRASH ──────────────────────────────────
    const message = err instanceof Error ? err.message : 'Unknown error';
    const duration = Date.now() - startTime;

    logError('[realvia-webhook] Unhandled error', {
      requestId,
      error: message,
      durationMs: duration,
    });

    return NextResponse.json(
      { error: 'Internal server error', request_id: requestId },
      { status: 500 },
    );
  }
}

/**
 * Health check — GET returns endpoint status.
 * Useful for monitoring and Realvia support debugging.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'realvia-webhook',
    timestamp: new Date().toISOString(),
  });
}
