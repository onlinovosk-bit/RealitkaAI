import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildRealviaInboundConfigSnapshot,
  countAllowedRealviaIPs,
} from './inboundDiagnostics';

describe('countAllowedRealviaIPs', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to single IP entry when REALVIA_ALLOWED_IP is omitted', () => {
    delete process.env.REALVIA_ALLOWED_IP;
    expect(countAllowedRealviaIPs()).toBe(1);
  });

  it('counts trimmed comma-separated entries', () => {
    vi.stubEnv('REALVIA_ALLOWED_IP', '185.59.208.101, 10.0.0.1');
    expect(countAllowedRealviaIPs()).toBe(2);
  });
});

describe('buildRealviaInboundConfigSnapshot', () => {
  const env = process.env;

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('REALVIA_IDENTIFIER', 'a');
    vi.stubEnv('REALVIA_IDENTIFIER_2', 'b');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'key');
    vi.stubEnv('CRON_SECRET', 'cron');
    vi.stubEnv('REALVIA_ALLOWED_IP', '185.59.208.101');
    delete process.env.REALVIA_SHARED_SECRET;
    delete process.env.REALVIA_DEFAULT_AGENCY_ID;
  });

  afterEach(() => {
    process.env = env;
    vi.unstubAllEnvs();
  });

  it('flags production misconfig when identifiers missing but shared secret present', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('REALVIA_IDENTIFIER', '');
    vi.stubEnv('REALVIA_IDENTIFIER_2', '');
    vi.stubEnv('REALVIA_SHARED_SECRET', 'x');

    const s = buildRealviaInboundConfigSnapshot();

    expect(s.checks.realviaIdentifier1).toBe(false);
    expect(s.checks.realviaIdentifier2).toBe(false);
    expect(s.checks.sharedSecretConfigured).toBe(true);
    expect(s.hints.some((h) => h.includes('identifikator'))).toBe(true);
  });

  it('warns when supabase vars missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');

    const s = buildRealviaInboundConfigSnapshot();

    expect(s.checks.supabaseUrlConfigured).toBe(false);
    expect(s.hints.some((h) => h.includes('Supabase URL'))).toBe(true);
  });
});
