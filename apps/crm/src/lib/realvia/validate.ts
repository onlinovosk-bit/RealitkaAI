// ================================================================
// Revolis.AI — Realvia Webhook Security Validation (L99 Production)
// IP validation, shared secret, payload size, HTTPS enforcement
// ================================================================

import { NextRequest } from 'next/server';
import { logWarn, logError } from '@/lib/logger';
import { normalizeRealviaIdentifikatorHeaderValue } from './resolveAgency';
import { REALVIA_AUTH_ERROR_MESSAGE } from './responses';

/** Max payload size: 5MB */
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024;

/** Allowed source IPs (Realvia servers) */
function getAllowedIPs(): string[] {
  const envIPs = process.env.REALVIA_ALLOWED_IP ?? '185.59.208.101';
  return envIPs.split(',').map(ip => ip.trim()).filter(Boolean);
}

/** Extract real client IP from request (handles reverse proxy) */
export function extractClientIP(request: NextRequest): string {
  // x-forwarded-for can be comma-separated list: client, proxy1, proxy2
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIP = forwarded.split(',')[0]?.trim();
    if (firstIP) return firstIP;
  }

  // x-real-ip (set by some proxies like nginx)
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP.trim();

  // Fallback: Vercel/Cloudflare headers
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP.trim();

  // Last resort
  return 'unknown';
}

/** Collect incoming request headers for audit/debug (secrets redacted). */
export function collectRequestHeaders(request: NextRequest): Record<string, string> {
  const headersMap: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === 'x-revolis-secret' ||
      lower === 'authorization' ||
      lower.includes('password') ||
      lower.includes('secret')
    ) {
      headersMap[key] = '[REDACTED]';
    } else {
      headersMap[key] = value;
    }
  });
  return headersMap;
}

/** Validate source IP against allowed list */
export function validateSourceIP(request: NextRequest): {
  valid: boolean;
  ip: string;
  reason?: string;
} {
  const ip = extractClientIP(request);
  const allowedIPs = getAllowedIPs();

  // In development, allow all IPs
  if (process.env.NODE_ENV === 'development') {
    return { valid: true, ip };
  }

  // Allow localhost in non-production (for testing)
  if (process.env.NODE_ENV !== 'production' && (ip === '127.0.0.1' || ip === '::1')) {
    return { valid: true, ip };
  }

  if (!allowedIPs.includes(ip)) {
    logWarn('[realvia-webhook] IP rejected', { ip, allowedIPs });
    return {
      valid: false,
      ip,
      reason: `Source IP ${ip} not in allowed list`,
    };
  }

  return { valid: true, ip };
}

/** Validate Realvia authentication (provider contract: identifikator pair). */
export function validateSecret(request: NextRequest): {
  valid: boolean;
  reason?: string;
} {
  const identifier1 = normalizeRealviaIdentifikatorHeaderValue(request.headers.get('identifikator') ?? '');
  const identifier2 = normalizeRealviaIdentifikatorHeaderValue(request.headers.get('identifikator2') ?? '');
  const xRevoliSecret = request.headers.get('x-revolis-secret') ?? '';
  const expectedId1 = normalizeRealviaIdentifikatorHeaderValue(process.env.REALVIA_IDENTIFIER ?? '');
  const expectedId2 = normalizeRealviaIdentifikatorHeaderValue(process.env.REALVIA_IDENTIFIER_2 ?? '');
  const expectedSecret = process.env.REALVIA_SHARED_SECRET;

  // Local dev: allow when no Realvia auth env is configured (smoke tests)
  if (process.env.NODE_ENV !== 'production') {
    const hasAuthConfig = Boolean(expectedId1 && expectedId2) || Boolean(expectedSecret);
    if (!hasAuthConfig) {
      return { valid: true };
    }
  }

  // Mode 1: Realvia export v2 — identifikator + identifikator2 (production primary)
  if (expectedId1 && expectedId2) {
    if (identifier1 && identifier2) {
      const id1Valid = timingSafeEqual(expectedId1, identifier1);
      const id2Valid = timingSafeEqual(expectedId2, identifier2);
      if (id1Valid && id2Valid) {
        return { valid: true };
      }
      logWarn('[realvia-webhook] Invalid identifikator headers');
      return { valid: false, reason: REALVIA_AUTH_ERROR_MESSAGE };
    }

    if (identifier1 || identifier2) {
      logWarn('[realvia-webhook] Partial identifikator headers');
      return { valid: false, reason: REALVIA_AUTH_ERROR_MESSAGE };
    }
  }

  // Mode 2: Optional internal/dev fallback — X-Revolis-Secret (not sent by Realvia)
  if (xRevoliSecret) {
    if (!expectedSecret) {
      logWarn('[realvia-webhook] X-Revolis-Secret received but REALVIA_SHARED_SECRET not configured');
      return { valid: false, reason: REALVIA_AUTH_ERROR_MESSAGE };
    }
    if (!timingSafeEqual(expectedSecret, xRevoliSecret)) {
      logWarn('[realvia-webhook] Invalid X-Revolis-Secret');
      return { valid: false, reason: REALVIA_AUTH_ERROR_MESSAGE };
    }
    return { valid: true };
  }

  if (process.env.NODE_ENV === 'production' && (!expectedId1 || !expectedId2)) {
    logError('[realvia-webhook] REALVIA_IDENTIFIER and REALVIA_IDENTIFIER_2 must be set in production');
    return { valid: false, reason: REALVIA_AUTH_ERROR_MESSAGE };
  }

  logWarn('[realvia-webhook] Missing authentication headers');
  return { valid: false, reason: REALVIA_AUTH_ERROR_MESSAGE };
}

/** Validate HTTPS in production */
export function validateHTTPS(request: NextRequest): {
  valid: boolean;
  reason?: string;
} {
  if (process.env.NODE_ENV !== 'production') {
    return { valid: true };
  }

  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (proto !== 'https') {
    logWarn('[realvia-webhook] Non-HTTPS request rejected in production');
    return { valid: false, reason: 'HTTPS required' };
  }

  return { valid: true };
}

/** Validate payload size */
export function validatePayloadSize(contentLength: number | null): {
  valid: boolean;
  reason?: string;
} {
  if (contentLength !== null && contentLength > MAX_PAYLOAD_BYTES) {
    logWarn('[realvia-webhook] Payload too large', {
      size: contentLength,
      max: MAX_PAYLOAD_BYTES,
    });
    return {
      valid: false,
      reason: `Payload too large: ${contentLength} bytes (max ${MAX_PAYLOAD_BYTES})`,
    };
  }

  return { valid: true };
}

/** Run all security validations */
export function validateRequest(request: NextRequest): {
  valid: boolean;
  ip: string;
  errors: string[];
} {
  const errors: string[] = [];
  let ip = 'unknown';

  // 1. HTTPS check
  const httpsResult = validateHTTPS(request);
  if (!httpsResult.valid && httpsResult.reason) {
    errors.push(httpsResult.reason);
  }

  // 2. IP validation
  const ipResult = validateSourceIP(request);
  ip = ipResult.ip;
  if (!ipResult.valid && ipResult.reason) {
    errors.push(ipResult.reason);
  }

  // 3. Secret validation
  const secretResult = validateSecret(request);
  if (!secretResult.valid && secretResult.reason) {
    errors.push(secretResult.reason);
  }

  // 4. Payload size
  const contentLength = request.headers.get('content-length');
  const sizeResult = validatePayloadSize(
    contentLength ? parseInt(contentLength, 10) : null,
  );
  if (!sizeResult.valid && sizeResult.reason) {
    errors.push(sizeResult.reason);
  }

  return {
    valid: errors.length === 0,
    ip,
    errors,
  };
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Falls back to simple comparison if crypto is unavailable.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  try {
    const encoder = new TextEncoder();
    const bufA = encoder.encode(a);
    const bufB = encoder.encode(b);

    if (bufA.length !== bufB.length) return false;

    let result = 0;
    for (let i = 0; i < bufA.length; i++) {
      result |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
    }
    return result === 0;
  } catch {
    // Fallback for environments without TextEncoder
    return a === b;
  }
}
