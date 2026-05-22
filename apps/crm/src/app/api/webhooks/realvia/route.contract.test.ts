import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { assertRealviaContractBody } from '@/lib/realvia/contract';

const validateRequest = vi.fn();

vi.mock('@/lib/realvia/validate', () => ({
  validateRequest: (...args: unknown[]) => validateRequest(...args),
}));

vi.mock('@/lib/realvia/resolveAgency', () => ({
  resolveAgencyIdFromRealviaHeaders: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/realvia/webhookStore', () => ({
  storeWebhookLog: vi.fn().mockResolvedValue({ success: true, id: 'log-1' }),
  enqueueProcessingJob: vi.fn().mockResolvedValue({ success: true, id: 'job-1' }),
}));

describe('POST /api/webhooks/realvia — Realvia contract', () => {
  beforeEach(() => {
    validateRequest.mockReset();
  });

  async function postWebhook(body = '{}', headers: Record<string, string> = {}) {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/webhooks/realvia', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body,
    });
    return POST(req);
  }

  it('403 validation failure uses result/message', async () => {
    validateRequest.mockReturnValue({
      valid: false,
      ip: '127.0.0.1',
      errors: ['Missing authentication headers'],
    });

    const res = await postWebhook();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      result: 'error',
      message: 'Missing authentication headers',
    });
  });

  it('400 invalid JSON uses result/message', async () => {
    validateRequest.mockReturnValue({ valid: true, ip: '127.0.0.1', errors: [] });

    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/webhooks/realvia', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    assertRealviaContractBody(await res.json());
  });

  it('200 success uses result ok + message (no legacy ok/request_id)', async () => {
    validateRequest.mockReturnValue({ valid: true, ip: '127.0.0.1', errors: [] });

    const res = await postWebhook('{"advert":{"id":"1"}}');
    expect(res.status).toBe(200);
    const json = await res.json();
    assertRealviaContractBody(json);
    expect(json).toEqual({ result: 'ok', message: 'Webhook received' });
    expect(json).not.toHaveProperty('request_id');
  });
});
