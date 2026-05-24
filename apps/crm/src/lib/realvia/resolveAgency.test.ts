import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { resolveAgencyIdFromRealviaHeaders } from './resolveAgency';

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleClient: vi.fn(),
}));

/** Valid v4-ish UUID samples for coercion (version nibble + variant nibble). */
const UUID_FROM_RPC = '22222222-2222-4222-a222-222222222222';
const UUID_FROM_LEGACY = '33333333-3333-4333-a333-333333333333';
const UUID_DEFAULT_ENV = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

type RpcOutcome = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

function makeSupabaseStub(rpcOutcome: RpcOutcome, legacyOutcome: {
  row: { id: string } | null;
  error: { message: string } | null;
}) {
  const legacyBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: legacyOutcome.row,
      error: legacyOutcome.error,
    }),
  };

  const client = {
    rpc: vi.fn().mockResolvedValue(rpcOutcome),
    from: vi.fn(() => legacyBuilder),
  };

  return { client, legacyBuilder };
}

describe('resolveAgencyIdFromRealviaHeaders', () => {
  beforeEach(() => {
    delete process.env.REALVIA_DEFAULT_AGENCY_ID;
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://stub.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
    vi.mocked(createServiceRoleClient).mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.REALVIA_DEFAULT_AGENCY_ID;
  });

  it('returns UUID from RPC and does not hit legacy agencies query', async () => {
    const { client } = makeSupabaseStub({ data: UUID_FROM_RPC, error: null }, { row: null, error: null });
    vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<
      typeof createServiceRoleClient
    >);

    const id = await resolveAgencyIdFromRealviaHeaders('  a ', '  b ');
    expect(id).toBe(UUID_FROM_RPC);
    expect(client.rpc).toHaveBeenCalledWith('resolve_agency_id_for_realvia', {
      p_ident1: 'a',
      p_ident2: 'b',
    });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('falls back to legacy .eq when RPC returns transport error', async () => {
    const { client } = makeSupabaseStub(
      { data: null, error: { message: 'postgres boom', code: 'PGRST301' } },
      { row: { id: UUID_FROM_LEGACY }, error: null },
    );
    vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<
      typeof createServiceRoleClient
    >);

    const id = await resolveAgencyIdFromRealviaHeaders('x', 'y');
    expect(id).toBe(UUID_FROM_LEGACY);
    expect(client.from).toHaveBeenCalledWith('agencies');
    expect(client.rpc).toHaveBeenCalledTimes(1);
  });

  it('falls back to legacy .eq when RPC returns no coerceable UUID', async () => {
    const { client } = makeSupabaseStub(
      { data: 'not-a-valid-uuid', error: null },
      { row: { id: UUID_FROM_LEGACY }, error: null },
    );
    vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<
      typeof createServiceRoleClient
    >);

    const id = await resolveAgencyIdFromRealviaHeaders('x', 'y');
    expect(id).toBe(UUID_FROM_LEGACY);
  });

  it('returns REALVIA_DEFAULT_AGENCY_ID when identifiers empty', async () => {
    vi.stubEnv('REALVIA_DEFAULT_AGENCY_ID', UUID_DEFAULT_ENV);
    const { client } = makeSupabaseStub({ data: null, error: null }, { row: null, error: null });
    vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<
      typeof createServiceRoleClient
    >);

    const id = await resolveAgencyIdFromRealviaHeaders('  ', '');
    expect(id).toBe(UUID_DEFAULT_ENV);
    expect(client.rpc).not.toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();
  });

  it('returns default when RPC and legacy miss and env default is valid', async () => {
    vi.stubEnv('REALVIA_DEFAULT_AGENCY_ID', UUID_DEFAULT_ENV);
    const { client } = makeSupabaseStub({ data: null, error: null }, { row: null, error: null });
    vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<
      typeof createServiceRoleClient
    >);

    const id = await resolveAgencyIdFromRealviaHeaders('n1', 'n2');
    expect(id).toBe(UUID_DEFAULT_ENV);
  });

  it('returns null when RPC and legacy miss and no valid default UUID in env', async () => {
    vi.stubEnv('REALVIA_DEFAULT_AGENCY_ID', 'not-valid-uuid');
    const { client } = makeSupabaseStub({ data: null, error: null }, { row: null, error: null });
    vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<
      typeof createServiceRoleClient
    >);

    const id = await resolveAgencyIdFromRealviaHeaders('n1', 'n2');
    expect(id).toBeNull();
  });

  it('returns default when legacy query errors', async () => {
    vi.stubEnv('REALVIA_DEFAULT_AGENCY_ID', UUID_DEFAULT_ENV);
    const { client } = makeSupabaseStub({ data: null, error: null }, {
      row: null,
      error: { message: 'boom' },
    });
    vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<
      typeof createServiceRoleClient
    >);

    const id = await resolveAgencyIdFromRealviaHeaders('n1', 'n2');
    expect(id).toBe(UUID_DEFAULT_ENV);
  });

  it('returns default when Supabase client is unavailable', async () => {
    vi.stubEnv('REALVIA_DEFAULT_AGENCY_ID', UUID_DEFAULT_ENV);
    vi.mocked(createServiceRoleClient).mockReturnValue(null);

    const id = await resolveAgencyIdFromRealviaHeaders('n1', 'n2');
    expect(id).toBe(UUID_DEFAULT_ENV);
  });
});
