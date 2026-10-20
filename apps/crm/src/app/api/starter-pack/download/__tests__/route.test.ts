import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/admin', () => ({ createServiceRoleClient: vi.fn(() => null) }));

import { GET } from '../route';
import { createStarterPackDownloadToken } from '@/lib/starter-pack/download-token';

const get = (qs: string) =>
  GET(new NextRequest(`https://app.revolis.ai/api/starter-pack/download${qs}`));

describe('GET /api/starter-pack/download', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('400 without token', async () => {
    expect((await get('')).status).toBe(400);
  });

  it('403 with forged token', async () => {
    vi.stubEnv('STARTER_PACK_DOWNLOAD_SECRET', 's3cret');
    expect((await get('?token=Zm9v.deadbeef')).status).toBe(403);
  });

  it('403 in production without signing secret, even for a dev-signed token', async () => {
    const forged = createStarterPackDownloadToken('cs_test_1'); // dev fallback secret
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('STARTER_PACK_DOWNLOAD_SECRET', '');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    expect((await get(`?token=${encodeURIComponent(forged)}`)).status).toBe(403);
  });

  it('503 in production when DB is unavailable (purchase cannot be verified)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('STARTER_PACK_DOWNLOAD_SECRET', 's3cret');
    const token = createStarterPackDownloadToken('cs_test_1');
    expect((await get(`?token=${encodeURIComponent(token)}`)).status).toBe(503);
  });
});
