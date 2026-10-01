/**
 * Fail-fast wrapper for Supabase HTTP. Undici's default headers timeout is 300s;
 * a stuck keep-alive then freezes SSR for minutes. Abort after 8s instead.
 */
export const DEFAULT_SUPABASE_FETCH_TIMEOUT_MS = 8_000;

export function getSupabaseFetchTimeoutMs(): number {
  const raw = process.env.SUPABASE_FETCH_TIMEOUT_MS;
  if (raw == null || raw === "") return DEFAULT_SUPABASE_FETCH_TIMEOUT_MS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SUPABASE_FETCH_TIMEOUT_MS;
  }
  return parsed;
}

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const timeoutMs = getSupabaseFetchTimeoutMs();
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  return fetch(input, { ...init, signal });
}
