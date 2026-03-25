
import { describe, it, beforeEach, expect, vi } from 'vitest';

// ESM hoisted mock for createActivity must be declared before any vi.mock
var createActivityMock;

// Error mock for ImapFlow
class ImapFlowErrorMock {
  constructor() {}
  connect = vi.fn().mockRejectedValueOnce(new Error('Connection failed'));
}

// Hoisted mocks for all modules
const supabaseDefaultMock = {
  createClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: () => ({ data: { imap_host: 'mock.imap.host', imap_port: 993, imap_user: 'mockuser', imap_password: 'mockpass' }, error: null }) }) }),
    }),
  }),
};
vi.mock('@/lib/supabase/server', () => supabaseDefaultMock);
vi.mock('@/lib/auth', () => ({
  getCurrentProfile: async () => ({ id: 'mock-profile', email: 'test@example.com', full_name: 'Test User' }),
}));
vi.mock('@/lib/send-onboarding-email', () => ({
  sendOnboardingEmail: vi.fn(),
}));

class ImapFlowMock {
  constructor() {}
  connect = vi.fn().mockResolvedValue(undefined);
  mailboxOpen = vi.fn().mockResolvedValue(undefined);
  fetch = vi.fn().mockImplementation(() => ({
    async *[Symbol.asyncIterator]() {
      console.log('ImapFlowMock.fetch: yielding Test Subject');
      yield { envelope: { subject: 'Test Subject', from: [{ address: 'sender@example.com' }] } };
      console.log('ImapFlowMock.fetch: yielding Another Email');
      yield { envelope: { subject: 'Another Email', from: [{ address: 'other@example.com' }] } };
    }
  }));
  logout = vi.fn().mockResolvedValue(undefined);
}

vi.mock('../activities-store-proxy', () => ({ get createActivity() { return createActivityMock; } }), { overwrite: true });
vi.mock('imapflow', () => ({ ImapFlow: ImapFlowMock }), { overwrite: true });
vi.mock('node_modules/imapflow', () => ({ ImapFlow: ImapFlowMock }), { overwrite: true });

describe('IMAP Email Sync', () => {
  beforeEach(async () => {
    vi.resetModules();
    createActivityMock = vi.fn().mockResolvedValue(undefined);
  });

  it('Synchronizuje nové emaily', async () => {
    const syncEmailInboxFn = (await import('../integrations-store')).syncEmailInbox;
    const result = await syncEmailInboxFn('mock-profile', createActivityMock);
    console.log('createActivityMock calls:', createActivityMock.mock.calls);
    expect(result.synced).toBe(2);
    expect(result.message).toMatch(/Synchronizovaných emailov/);
    expect(createActivityMock).toHaveBeenCalledWith('mock-profile', 'Email', expect.stringContaining('Test Subject'));
    expect(createActivityMock).toHaveBeenCalledWith('mock-profile', 'Email', expect.stringContaining('Another Email'));
  });


  it('Chýbajúca IMAP konfigurácia', async () => {
    vi.mock('@/lib/supabase/server', () => ({
      createClient: () => ({
        from: () => ({
          select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
        }),
      }),
    }), { overwrite: true });
    const syncEmailInboxFn = (await import('../integrations-store')).syncEmailInbox;
    const result = await syncEmailInboxFn('missing-profile');
    expect(result.synced).toBe(0);
    expect(result.message).toMatch(/IMAP konfigurácia neexistuje/);
  });

  it('Chyba pri synchronizácii emailu', async () => {
    // Temporarily override connect to throw
    const originalConnect = ImapFlowMock.prototype.connect;
    ImapFlowMock.prototype.connect = vi.fn().mockRejectedValueOnce(new Error('Connection failed'));
    const syncEmailInboxFn = (await import('../integrations-store')).syncEmailInbox;
    const result = await syncEmailInboxFn('mock-profile');
    expect(result.synced).toBe(0);
    expect(result.message).toMatch(/IMAP konfigurácia neexistuje/);
    ImapFlowMock.prototype.connect = originalConnect;
  });
});
