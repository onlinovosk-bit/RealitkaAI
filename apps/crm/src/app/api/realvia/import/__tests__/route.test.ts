import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

describe('POST /api/realvia/import', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects unauthenticated request with 403 in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('REALVIA_IDENTIFIER', 'id-1');
    vi.stubEnv('REALVIA_IDENTIFIER_2', 'id-2');
    const res = await POST(
      new NextRequest('https://app.revolis.ai/api/realvia/import', {
        method: 'POST',
        headers: { 'content-type': 'application/xml', 'x-forwarded-for': '203.0.113.9' },
        body: '<x/>',
      }),
    );
    expect(res.status).toBe(403);
  });
});
