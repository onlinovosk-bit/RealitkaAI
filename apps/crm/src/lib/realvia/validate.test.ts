import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { validateSecret, collectRequestHeaders } from './validate';
import { REALVIA_AUTH_ERROR_MESSAGE } from './responses';

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest('https://app.revolis.ai/api/webhooks/realvia', {
    method: 'POST',
    headers,
  });
}

describe('collectRequestHeaders', () => {
  it('redacts secret headers', () => {
    const headers = collectRequestHeaders(
      makeRequest({
        identifikator: 'id1',
        'x-revolis-secret': 'top-secret',
        'content-type': 'application/json',
      }),
    );
    expect(headers.identifikator).toBe('id1');
    expect(headers['x-revolis-secret']).toBe('[REDACTED]');
    expect(headers['content-type']).toBe('application/json');
  });
});

describe('validateSecret — unified auth error message', () => {
  const env = process.env;

  beforeEach(() => {
    vi.stubEnv('REALVIA_SHARED_SECRET', 'shared-secret');
    vi.stubEnv('REALVIA_IDENTIFIER', 'id1');
    vi.stubEnv('REALVIA_IDENTIFIER_2', 'id2');
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    process.env = env;
    vi.unstubAllEnvs();
  });

  it('returns unified message when auth headers are missing', () => {
    const result = validateSecret(makeRequest());
    expect(result.valid).toBe(false);
    expect(result.reason).toBe(REALVIA_AUTH_ERROR_MESSAGE);
  });

  it('returns unified message when identifikator values are wrong', () => {
    const result = validateSecret(
      makeRequest({ identifikator: 'wrong', identifikator2: 'wrong' }),
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe(REALVIA_AUTH_ERROR_MESSAGE);
  });

  it('returns unified message when X-Revolis-Secret is wrong', () => {
    vi.stubEnv('REALVIA_IDENTIFIER', '');
    vi.stubEnv('REALVIA_IDENTIFIER_2', '');

    const result = validateSecret(
      makeRequest({ 'x-revolis-secret': 'wrong-secret' }),
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe(REALVIA_AUTH_ERROR_MESSAGE);
  });

  it('accepts identifikator pair in production without REALVIA_SHARED_SECRET', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.unstubAllEnvs();
    vi.stubEnv('REALVIA_IDENTIFIER', 'id1');
    vi.stubEnv('REALVIA_IDENTIFIER_2', 'id2');
    vi.stubEnv('NODE_ENV', 'production');

    const result = validateSecret(
      makeRequest({ identifikator: 'id1', identifikator2: 'id2' }),
    );
    expect(result.valid).toBe(true);
  });

  it('accepts identifikator headers with surrounding square brackets (Realvia quirk)', () => {
    vi.stubEnv('REALVIA_IDENTIFIER', 'id1');
    vi.stubEnv('REALVIA_IDENTIFIER_2', 'id2');
    const result = validateSecret(
      makeRequest({ identifikator: '[id1]', identifikator2: '[id2]' }),
    );
    expect(result.valid).toBe(true);
  });

  it('rejects production requests when identifikator env is missing', () => {
    vi.unstubAllEnvs();
    vi.stubEnv('REALVIA_IDENTIFIER', '');
    vi.stubEnv('REALVIA_IDENTIFIER_2', '');
    vi.stubEnv('NODE_ENV', 'production');

    const result = validateSecret(
      makeRequest({ identifikator: 'id1', identifikator2: 'id2' }),
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe(REALVIA_AUTH_ERROR_MESSAGE);
  });
});
