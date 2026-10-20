import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/realsoft/auth', () => ({
  resolveAgencyIdFromRealsoftCredentials: vi.fn(async () => ({
    ok: false,
    reason: 'invalid_credentials',
  })),
}));
vi.mock('@/lib/uc/persist', () => ({
  persistUcAgent: vi.fn(),
  persistUcListing: vi.fn(),
  softDeleteUcAgent: vi.fn(),
  softDeleteUcListing: vi.fn(),
  storeUcImportLog: vi.fn(),
}));

import { POST } from '../route';
import * as persist from '@/lib/uc/persist';

describe('POST /api/realsoft/import', () => {
  it('rejects wrong credentials and persists nothing', async () => {
    const res = await POST(
      new NextRequest('https://app.revolis.ai/api/realsoft/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user: 'x', pass: 'y', action: 1, data: { object_id: '1' } }),
      }),
    );
    expect(res.status).not.toBe(500);
    expect(persist.persistUcListing).not.toHaveBeenCalled();
    expect(persist.softDeleteUcListing).not.toHaveBeenCalled();
  });
});
