import { describe, expect, it } from 'vitest';
import {
  REALVIA_PROBE_TERMINAL_ERROR,
  isOnboardingProbePayload,
  planQueueFailure,
} from './queueRetry';

describe('isOnboardingProbePayload', () => {
  it('matches the onboarding curl body', () => {
    expect(isOnboardingProbePayload({ test: true, export_id: 'EXPORT_ID_KLIENTA' })).toBe(true);
  });

  it('does not match advert-shaped or empty bodies', () => {
    expect(isOnboardingProbePayload({ source_id: 1, title: 'x' })).toBe(false);
    expect(isOnboardingProbePayload({ test: false })).toBe(false);
    expect(isOnboardingProbePayload(null)).toBe(false);
    expect(isOnboardingProbePayload([])).toBe(false);
  });
});

describe('planQueueFailure', () => {
  it('requeues until max_retries then stays failed', () => {
    const first = planQueueFailure({ retryCount: 0, maxRetries: 3 });
    expect(first).toMatchObject({ retryCount: 1, status: 'pending', terminal: false, delayMs: 30_000 });

    const second = planQueueFailure({ retryCount: 1, maxRetries: 3 });
    expect(second.status).toBe('pending');
    expect(second.terminal).toBe(false);

    const third = planQueueFailure({ retryCount: 2, maxRetries: 3 });
    expect(third).toMatchObject({ retryCount: 3, status: 'failed', terminal: true, delayMs: null });
  });

  it('treats a missing max as 3', () => {
    expect(planQueueFailure({ retryCount: 2, maxRetries: null }).terminal).toBe(true);
  });
});

describe('probe terminal error', () => {
  it('is a stable string replay can refuse', () => {
    expect(REALVIA_PROBE_TERMINAL_ERROR).toContain('terminal after max_retries');
  });
});
