// ================================================================
// Revolis.AI — /api/webhooks/realvia: diagnostika nie je verejná (REALVIA-SEC-01)
//
// `?dump=headers` bol do 2026-10-07 bez autentifikácie. Sám prihlasovacie údaje
// neprezradil (vracia hlavičky VOLAJÚCEHO, nie Realviine), ale komukoľvek na
// internete vypísal Vercel metadáta nášho nasadenia — deployment URL, región,
// ray id. Diagnostika má rovnakú bránu ako cron: `Bearer $CRON_SECRET`.
//
// Health check bez parametra zostáva verejný zámerne: Realvia aj uptime monitor
// ním overujú, že endpoint žije, a neobsahuje nič okrem názvu služby a času.
// ================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const SECRET = 'cron-secret-na-test';

function get(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { method: 'GET', headers });
}

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/webhooks/realvia — brána na diagnostike', () => {
  it('health check bez parametra zostáva verejný', async () => {
    const { GET } = await import('../route');
    const res = await GET(get('https://app.revolis.ai/api/webhooks/realvia'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('realvia-webhook');
    // Nič navyše — žiadne hlavičky, žiadna konfigurácia.
    expect(body.headers).toBeUndefined();
    expect(body.checks).toBeUndefined();
  });

  it('PINUJE OPRAVU: dump=headers bez autentifikácie dostane 401', async () => {
    const { GET } = await import('../route');
    const res = await GET(
      get('https://app.revolis.ai/api/webhooks/realvia?dump=headers', {
        'x-vercel-id': 'fra1::tajne-interne-id',
      }),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.headers).toBeUndefined();
  });

  it('dump=headers so správnym secretom vráti hlavičky s redakciou', async () => {
    const { GET } = await import('../route');
    const res = await GET(
      get('https://app.revolis.ai/api/webhooks/realvia?dump=headers', {
        authorization: `Bearer ${SECRET}`,
        identifikator: 'id1',
        'user-agent': 'Realvia/2.0',
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.headers['user-agent']).toBe('Realvia/2.0');
    // Aj za bránou — operátor diagnostiku vidí, credential nie.
    expect(body.headers.identifikator).toBe('[REDACTED]');
    expect(body.headers.authorization).toBe('[REDACTED]');
  });

  it('diag=config bez autentifikácie dostane 401', async () => {
    const { GET } = await import('../route');
    const res = await GET(get('https://app.revolis.ai/api/webhooks/realvia?diag=config'));
    expect(res.status).toBe(401);
  });

  it('zlý secret dostane 401 na oboch parametroch', async () => {
    const { GET } = await import('../route');
    for (const param of ['dump=headers', 'diag=config']) {
      const res = await GET(
        get(`https://app.revolis.ai/api/webhooks/realvia?${param}`, {
          authorization: 'Bearer zly-secret',
        }),
      );
      expect(res.status).toBe(401);
    }
  });

  it('bez CRON_SECRET sa diagnostika neotvorí (fail-closed)', async () => {
    // Chýbajúca premenná je chyba konfigurácie, nie povolenie — rovnaká logika
    // ako pri RESEND_WEBHOOK_SECRET (#717).
    vi.stubEnv('CRON_SECRET', '');
    const { GET } = await import('../route');
    const res = await GET(
      get('https://app.revolis.ai/api/webhooks/realvia?dump=headers', {
        authorization: 'Bearer ',
      }),
    );
    expect(res.status).toBe(401);
  });
});
