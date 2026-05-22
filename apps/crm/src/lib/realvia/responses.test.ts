import { describe, expect, it } from 'vitest';
import { pickRealviaErrorMessage } from './responses';

describe('pickRealviaErrorMessage', () => {
  it('prefers authentication-related errors', () => {
    expect(
      pickRealviaErrorMessage([
        'Source IP 1.2.3.4 not in allowed list',
        'Invalid authentication',
      ]),
    ).toBe('Invalid authentication');
  });

  it('falls back to first error', () => {
    expect(pickRealviaErrorMessage(['Payload too large'])).toBe('Payload too large');
  });

  it('returns default when empty', () => {
    expect(pickRealviaErrorMessage([])).toBe('Request rejected');
  });
});
