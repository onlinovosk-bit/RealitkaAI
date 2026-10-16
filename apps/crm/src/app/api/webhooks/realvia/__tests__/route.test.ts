import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

const CRON_SECRET = 'test-cron-secret';
const WRONG_SECRET = 'wrong-cron-secret';

const SECRET_HEADER_VALUES = {
  authorization: `Bearer ${CRON_SECRET}`,
  'x-vercel-oidc-token': 'oidc-token-value',
  'x-vercel-proxy-signature': 'proxy-signature-value',
  'x-vercel-sc-headers': '{"Authorization":"Bearer internal"}',
} as const;

function makeGet(path: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest(`https://app.revolis.ai${path}`, {
    method: 'GET',
    headers,
  });
}

describe('GET /api/webhooks/realvia', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns health check without authorization', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeGet('/api/webhooks/realvia'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('realvia-webhook');
  });

  describe('?dump=headers', () => {
    it('returns 401 without token', async () => {
      vi.stubEnv('CRON_SECRET', CRON_SECRET);
      const res = await GET(makeGet('/api/webhooks/realvia?dump=headers'));
      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' });
    });

    it('returns 401 with wrong token', async () => {
      vi.stubEnv('CRON_SECRET', CRON_SECRET);
      const res = await GET(
        makeGet('/api/webhooks/realvia?dump=headers', {
          authorization: `Bearer ${WRONG_SECRET}`,
        }),
      );
      expect(res.status).toBe(401);
    });

    it('returns 401 when CRON_SECRET is unset even with a bearer token', async () => {
      delete process.env.CRON_SECRET;
      const res = await GET(
        makeGet('/api/webhooks/realvia?dump=headers', {
          authorization: `Bearer ${CRON_SECRET}`,
        }),
      );
      expect(res.status).toBe(401);
    });

    it('returns 200 with correct token and redacts secrets and proxy headers', async () => {
      vi.stubEnv('CRON_SECRET', CRON_SECRET);
      const res = await GET(
        makeGet('/api/webhooks/realvia?dump=headers', {
          ...SECRET_HEADER_VALUES,
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.10',
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.service).toBe('realvia-webhook');
      expect(body.headers.authorization).toBe('[REDACTED]');
      expect(body.headers['x-vercel-oidc-token']).toBe('[REDACTED]');
      expect(body.headers['x-vercel-proxy-signature']).toBe('[REDACTED]');
      expect(body.headers['x-vercel-sc-headers']).toBe('[REDACTED]');
      expect(body.headers['content-type']).toBe('application/json');

      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain(CRON_SECRET);
      expect(serialized).not.toContain(SECRET_HEADER_VALUES['x-vercel-oidc-token']);
      expect(serialized).not.toContain(SECRET_HEADER_VALUES['x-vercel-proxy-signature']);
      expect(serialized).not.toContain(SECRET_HEADER_VALUES['x-vercel-sc-headers']);
      expect(serialized).not.toContain('Bearer internal');
    });
  });

  describe('?diag=config', () => {
    it('returns 401 without token', async () => {
      vi.stubEnv('CRON_SECRET', CRON_SECRET);
      const res = await GET(makeGet('/api/webhooks/realvia?diag=config'));
      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' });
    });

    it('returns 401 with wrong token', async () => {
      vi.stubEnv('CRON_SECRET', CRON_SECRET);
      const res = await GET(
        makeGet('/api/webhooks/realvia?diag=config', {
          authorization: `Bearer ${WRONG_SECRET}`,
        }),
      );
      expect(res.status).toBe(401);
    });

    it('returns 401 when CRON_SECRET is unset', async () => {
      delete process.env.CRON_SECRET;
      const res = await GET(
        makeGet('/api/webhooks/realvia?diag=config', {
          authorization: `Bearer ${CRON_SECRET}`,
        }),
      );
      expect(res.status).toBe(401);
    });

    it('returns 200 with correct token and no secret values', async () => {
      vi.stubEnv('CRON_SECRET', CRON_SECRET);
      const res = await GET(
        makeGet('/api/webhooks/realvia?diag=config', {
          authorization: `Bearer ${CRON_SECRET}`,
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.service).toBe('realvia-webhook');
      expect(body.diag).toBe('inbound-config');
      expect(body.checks).toBeDefined();
      expect(body.checks.cronSecretConfigured).toBe(true);

      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain(CRON_SECRET);
      expect(serialized).not.toContain(`Bearer ${CRON_SECRET}`);
    });
  });
});
