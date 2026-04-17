import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: {
    auth: { getUser: () => ({ data: { user: null } }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
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

describe('billing-store', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  describe('createCustomerPortalSession', () => {
    it(
      'returns hasStripeConfigured: false when STRIPE_SECRET_KEY is missing',
      async () => {
        vi.stubEnv('STRIPE_SECRET_KEY', '');
        vi.resetModules();
        const { createCustomerPortalSession } = await import('@/lib/billing-store');
        const result = await createCustomerPortalSession();
        expect(result.hasStripeConfigured).toBe(false);
        expect(result.url).toBeNull();
      },
      15_000,
    );
  });

  describe('createBillingCheckoutSession', () => {
    it('returns null when Stripe is not configured', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', '');
      const { createBillingCheckoutSession } = await import('@/lib/billing-store');
      const result = await createBillingCheckoutSession('pro');
      expect(result).toBeNull();
    });
  });

  describe('getCurrentBillingStatus', () => {
    it('returns safe defaults when Stripe is not configured', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', '');
      const { getCurrentBillingStatus } = await import('@/lib/billing-store');
      const result = await getCurrentBillingStatus();
      expect(result.hasCustomer).toBe(false);
      expect(result.hasSubscription).toBe(false);
      expect(result.invoices).toEqual([]);
    });
  });

  describe('getCurrentPlanTier', () => {
    it('returns "free" when no subscription exists', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', '');
      const { getCurrentPlanTier } = await import('@/lib/billing-store');
      const tier = await getCurrentPlanTier();
      expect(tier).toBe('free');
    });
  });

  describe('BILLING_PLANS', () => {
    it('has 3 plans defined', async () => {
      const { BILLING_PLANS } = await import('@/lib/billing-store');
      expect(BILLING_PLANS).toHaveLength(3);
    });

    it('each plan has required fields', async () => {
      const { BILLING_PLANS } = await import('@/lib/billing-store');
      for (const plan of BILLING_PLANS) {
        expect(plan.key).toBeTruthy();
        expect(plan.name).toBeTruthy();
        expect(plan.priceLabel).toBeTruthy();
        expect(plan.description).toBeTruthy();
        expect(Array.isArray(plan.features)).toBe(true);
        expect(plan.features.length).toBeGreaterThan(0);
      }
    });

    it('exactly one plan is recommended', async () => {
      const { BILLING_PLANS } = await import('@/lib/billing-store');
      const recommended = BILLING_PLANS.filter(p => p.recommended);
      expect(recommended).toHaveLength(1);
      expect(recommended[0].key).toBe('pro');
    });
  });
});
