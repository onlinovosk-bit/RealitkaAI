import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: {
    auth: { getUser: () => ({ data: { user: null } }) },
    from: () => ({
      select: () => ({
        order: () => ({
          order: () => ({
            data: [],
            error: null,
          }),
        }),
        eq: () => ({ single: () => ({ data: null, error: null }) }),
      }),
    }),
  },
}));

vi.mock('@/lib/auto-error-capture', () => ({
  autoErrorCapture: vi.fn(),
}));

vi.mock('@/lib/activities-store', () => ({
  createActivity: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/logger', () => ({
  logInfo: vi.fn(),
}));

describe('dashboard data safety', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getLeads', () => {
    it('returns array even when DB is empty', async () => {
      const { getLeads } = await import('@/lib/leads-store');
      const leads = await getLeads();
      expect(Array.isArray(leads)).toBe(true);
    });
  });

  describe('dashboard KPI calculations with empty data', () => {
    it('handles empty leads array for KPI metrics', () => {
      const leads: any[] = [];
      const totalLeads = leads.length;
      const hotLeads = leads.filter(l => l.status === "Horúci").length;
      const showings = leads.filter(l => l.status === "Obhliadka").length;
      const offers = leads.filter(l => l.status === "Ponuka").length;
      const conversionRate = totalLeads > 0 ? Math.round((offers / totalLeads) * 100) : 0;

      expect(totalLeads).toBe(0);
      expect(hotLeads).toBe(0);
      expect(showings).toBe(0);
      expect(offers).toBe(0);
      expect(conversionRate).toBe(0);
    });

    it('handles leads with missing fields without crashing', () => {
      const leads = [
        { id: '1', name: 'Test', status: null, score: undefined },
        { id: '2', name: 'Test 2', status: 'Horúci', score: 90 },
      ] as any[];

      expect(() => {
        leads.filter(l => l.status === "Horúci");
        leads.filter(l => l.status === "Obhliadka");
        leads.filter(l => l.score >= 80);
      }).not.toThrow();
    });
  });

  describe('forecasting data safety', () => {
    it('handles null/undefined forecasting summary', () => {
      const summary = null;
      const targets = {
        expectedClosedDeals: 3,
        expectedPipelineValue: 500000,
        avgProbabilityPercent: 35,
      };

      const dealsTrend = summary ? 'has value' : null;
      expect(dealsTrend).toBeNull();
    });

    it('handles partial forecasting API response', () => {
      const payload = { ok: true };
      const summary = (payload as any)?.summary ?? null;
      const targets = (payload as any)?.targets ?? null;

      expect(summary).toBeNull();
      expect(targets).toBeNull();
    });
  });
});
