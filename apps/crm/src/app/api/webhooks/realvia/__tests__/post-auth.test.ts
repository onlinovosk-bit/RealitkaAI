import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

describe('POST /api/webhooks/realvia auth', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects unauthenticated request with 403 in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('REALVIA_IDENTIFIER', 'id-1');
    vi.stubEnv('REALVIA_IDENTIFIER_2', 'id-2');
    const res = await POST(
      new NextRequest('https://app.revolis.ai/api/webhooks/realvia', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
        body: '{}',
      }),
    );
    expect(res.status).toBe(403);
  });
});
