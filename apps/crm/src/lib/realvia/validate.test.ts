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
        'x-revolis-secret': 'top-secret',
        authorization: 'Bearer abc',
        'content-type': 'application/json',
      }),
    );
    expect(headers['x-revolis-secret']).toBe('[REDACTED]');
    expect(headers.authorization).toBe('[REDACTED]');
    expect(headers['content-type']).toBe('application/json');
  });

  it('PINUJE OPRAVU: identifikator headers sú prihlasovacie údaje, nie metadáta', () => {
    // Pôvodná verzia tohto testu tvrdila `expect(headers.identifikator).toBe('id1')`
    // — teda PRIKAZOVALA, aby sa credential vypísal. Tým bola diera zamknutá
    // testom: `logInfo('[realvia-webhook] Incoming headers')` aj `headers_json`
    // v `realvia_webhook_logs` dostávali `identifikator`/`identifikator2`
    // v čitateľnej podobe pri každom doručení, a CI to považovalo za správne.
    //
    // `identifikator` + `identifikator2` sú Mode 1 vo `validateSecret` —
    // PRIMÁRNA produkčná autentifikácia. Kto ich prečíta z logu, môže sa
    // vydávať za Realviu.
    const headers = collectRequestHeaders(
      makeRequest({
        identifikator: 'id1',
        identifikator2: 'id2',
        identifikator3: 'buduci-format',
        'x-api-key': 'k',
        'x-auth-token': 't',
      }),
    );
    expect(headers.identifikator).toBe('[REDACTED]');
    expect(headers.identifikator2).toBe('[REDACTED]');
    // Prefix, nie zoznam presných mien — inak by nový formát ticho unikal.
    expect(headers.identifikator3).toBe('[REDACTED]');
    expect(headers['x-api-key']).toBe('[REDACTED]');
    expect(headers['x-auth-token']).toBe('[REDACTED]');
  });

  it('nezatají hlavičky, ktoré credentials nie sú', () => {
    // Opačná strana: redakcia nesmie zožrať diagnostickú hodnotu hlavičiek.
    const headers = collectRequestHeaders(
      makeRequest({
        'user-agent': 'Realvia/2.0',
        'x-forwarded-for': '185.59.208.101',
        'x-vercel-id': 'fra1::abc',
      }),
    );
    expect(headers['user-agent']).toBe('Realvia/2.0');
    expect(headers['x-forwarded-for']).toBe('185.59.208.101');
    expect(headers['x-vercel-id']).toBe('fra1::abc');
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
