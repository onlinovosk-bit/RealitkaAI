import { type NextRequest, NextResponse } from "next/server";

import { isLangfuseEnabled } from "@/lib/langfuse/config";

const W3C_TRACE_HEADERS = ["traceparent", "tracestate", "baggage"] as const;

function randomHex(byteCount: number): string {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createTraceparent(): string {
  return `00-${randomHex(16)}-${randomHex(8)}-01`;
}

function ensureTraceHeaders(headers: Headers): void {
  if (!headers.get("traceparent")) {
    headers.set("traceparent", createTraceparent());
  }
}

/**
 * Propagate W3C trace context through Next.js middleware/proxy.
 * No-op when Langfuse keys are missing (dev-friendly).
 */
export function withLangfuseTraceContext(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  if (!isLangfuseEnabled()) return response;

  const requestHeaders = new Headers(request.headers);
  ensureTraceHeaders(requestHeaders);

  for (const header of W3C_TRACE_HEADERS) {
    const value = requestHeaders.get(header);
    if (value) {
      response.headers.set(header, value);
    }
  }

  return response;
}

/** Create NextResponse.next() with trace context forwarded to route handlers. */
export function traceNext(request: NextRequest, init?: ResponseInit): NextResponse {
  if (!isLangfuseEnabled()) return NextResponse.next(init);

  const requestHeaders = new Headers(request.headers);
  ensureTraceHeaders(requestHeaders);

  const response = NextResponse.next({
    ...init,
    request: { headers: requestHeaders },
  });

  return withLangfuseTraceContext(request, response);
}

/** Wrap an existing middleware/proxy response with trace headers. */
export function traceResponse(request: NextRequest, response: NextResponse): NextResponse {
  return withLangfuseTraceContext(request, response);
}
