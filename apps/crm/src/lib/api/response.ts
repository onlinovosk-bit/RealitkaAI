import { NextResponse } from "next/server";

export function securityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, {
    status,
    headers: securityHeaders(),
  });
}

export function apiErr(message: string, status = 400, code?: string) {
  return NextResponse.json({ ok: false, error: message, code }, {
    status,
    headers: securityHeaders(),
  });
}

const rateLimitMap = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(key: string, maxPerMinute = 60): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(key, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}
