/**
 * Realvia queue retry policy.
 * Probe payloads from the onboarding curl (`{"test": true}`) are not adverts.
 * They may retry up to max_retries, then they stay failed. Replay must not
 * reset that terminal row back to pending.
 */

export const REALVIA_PROBE_TERMINAL_ERROR =
  'Onboarding probe payload {test:true} is not a Realvia advert or delete; terminal after max_retries';

export function isOnboardingProbePayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  return (payload as { test?: unknown }).test === true;
}

export function planQueueFailure(input: {
  retryCount: number;
  maxRetries: number | null | undefined;
}): {
  retryCount: number;
  status: 'pending' | 'failed';
  terminal: boolean;
  delayMs: number | null;
} {
  const max = input.maxRetries && input.maxRetries > 0 ? input.maxRetries : 3;
  const retryCount = (input.retryCount ?? 0) + 1;
  const terminal = retryCount >= max;
  return {
    retryCount,
    status: terminal ? 'failed' : 'pending',
    terminal,
    delayMs: terminal ? null : 30_000 * Math.pow(4, retryCount - 1),
  };
}
