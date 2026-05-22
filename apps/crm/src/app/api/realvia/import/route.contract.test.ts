import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { assertRealviaContractBody } from '@/lib/realvia/contract';

const validateRequest = vi.fn();

vi.mock('@/lib/realvia/validate', () => ({
  validateRequest: (...args: unknown[]) => validateRequest(...args),
}));

describe('POST /api/realvia/import — Realvia contract', () => {
  beforeEach(() => {
    validateRequest.mockReset();
  });

  async function postImport(body = '<export/>', headers: Record<string, string> = {}) {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/realvia/import', {
      method: 'POST',
      headers: { 'content-type': 'application/xml', ...headers },
      body,
    });
    return POST(req);
  }

  it('403 validation failure uses result/message (never error/details)', async () => {
    validateRequest.mockReturnValue({
      valid: false,
      ip: '127.0.0.1',
      errors: ['Invalid authentication'],
    });

    const res = await postImport();
    expect(res.status).toBe(403);
    const json = await res.json();
    assertRealviaContractBody(json);
    expect(json).toEqual({ result: 'error', message: 'Invalid authentication' });
  });

  it('400 invalid content-type uses result/message', async () => {
    validateRequest.mockReturnValue({ valid: true, ip: '127.0.0.1', errors: [] });

    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/realvia/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    assertRealviaContractBody(await res.json());
  });

  it('200 success uses result ok + message', async () => {
    validateRequest.mockReturnValue({ valid: true, ip: '127.0.0.1', errors: [] });

    const res = await postImport();
    expect(res.status).toBe(200);
    const json = await res.json();
    assertRealviaContractBody(json);
    expect(json).toEqual({ result: 'ok', message: 'Export received' });
  });
});
