import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockProfileUpdateEq = vi.fn().mockResolvedValue({ error: null });
const mockProfileUpdate = vi.fn(() => ({ eq: mockProfileUpdateEq }));

/** Avoid loading the real Stripe SDK in Vitest — cold import can exceed default test timeout on Windows */
vi.mock('stripe', () => ({
  default: vi.fn(function StripePlaceholder(this: Record<string, unknown>) {
    this.billingPortal = { sessions: { create: vi.fn() } };
    this.customers = {
      list: vi.fn(async () => ({ data: [] })),
      retrieve: vi.fn(),
    };
    return undefined;
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: {
    auth: { getUser: () => ({ data: { user: null } }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
    }),
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      if (table === 'profiles') {
        return { update: mockProfileUpdate };
      }
      return {
        select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
      };
    },
  }),
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
    vi.clearAllMocks();
  });

  describe('createCustomerPortalSession', () => {
    it('returns hasStripeConfigured: false when STRIPE_SECRET_KEY is missing', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', '');
      const { createCustomerPortalSession } = await import('@/lib/billing-store');
      const result = await createCustomerPortalSession();
      expect(result.hasStripeConfigured).toBe(false);
      expect(result.url).toBeNull();
    });
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
    it('has 4 plans defined', async () => {
      const { BILLING_PLANS } = await import('@/lib/billing-store');
      expect(BILLING_PLANS).toHaveLength(4);
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

  describe('isPricingCheckoutMetadata', () => {
    it('recognizes seat / top-up / starter-pack checkout types', async () => {
      const { isPricingCheckoutMetadata } = await import('@/lib/billing-store');
      expect(isPricingCheckoutMetadata({ checkoutType: 'seat' })).toBe(true);
      expect(isPricingCheckoutMetadata({ checkoutType: 'credit_topup' })).toBe(true);
      expect(isPricingCheckoutMetadata({ checkoutType: 'starter_pack' })).toBe(true);
      expect(isPricingCheckoutMetadata({ planKey: 'pro' })).toBe(false);
      expect(isPricingCheckoutMetadata(null)).toBe(false);
    });
  });

  describe('resolvePlanKeyFromStripePriceId seat prices', () => {
    it('maps self-serve seat Stripe prices to plan keys (not free)', async () => {
      vi.stubEnv('STRIPE_PRICE_SOLO_SEAT', 'price_solo_seat_test');
      vi.stubEnv('STRIPE_PRICE_TEAM_SEAT', 'price_team_seat_test');
      vi.stubEnv('STRIPE_PRICE_OFFICE_SEAT', 'price_office_seat_test');

      const { resolvePlanKeyFromStripePriceId } = await import('@/lib/billing-store');
      expect(resolvePlanKeyFromStripePriceId('price_solo_seat_test')).toBe('starter');
      expect(resolvePlanKeyFromStripePriceId('price_team_seat_test')).toBe('pro');
      expect(resolvePlanKeyFromStripePriceId('price_office_seat_test')).toBe('enterprise');
    });
  });

  describe('handleStripeWebhookEvent pricing checkout guard', () => {
    it('does not overwrite profile tier on seat/top-up checkout.session.completed', async () => {
      const { handleStripeWebhookEvent } = await import('@/lib/billing-store');

      await handleStripeWebhookEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_seat_paid',
            customer: 'cus_1',
            customer_email: 'broker@example.com',
            metadata: {
              checkoutType: 'seat',
              authUserId: 'user-1',
              agencyId: 'agency-1',
              seatTier: 'team',
            },
          },
        },
      } as never);

      expect(mockProfileUpdate).not.toHaveBeenCalled();

      await handleStripeWebhookEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_topup_paid',
            customer: 'cus_1',
            customer_email: 'broker@example.com',
            metadata: {
              checkoutType: 'credit_topup',
              authUserId: 'user-1',
              agencyId: 'agency-1',
              topupPackage: 'rast',
            },
          },
        },
      } as never);

      expect(mockProfileUpdate).not.toHaveBeenCalled();
    });

    it('still syncs legacy planKey checkout to the paid tier', async () => {
      vi.resetModules();
      vi.stubEnv('STRIPE_PRICE_PRO', 'price_legacy_pro');
      const { handleStripeWebhookEvent, BILLING_PLANS } = await import('@/lib/billing-store');
      expect(BILLING_PLANS.find((p) => p.key === 'pro')?.priceId).toBe('price_legacy_pro');

      await handleStripeWebhookEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_legacy_pro',
            customer: 'cus_1',
            customer_email: 'broker@example.com',
            metadata: {
              planKey: 'pro',
              authUserId: 'user-legacy',
            },
          },
        },
      } as never);

      expect(mockProfileUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ account_tier: 'pro' }),
      );
      expect(mockProfileUpdateEq).toHaveBeenCalledWith('auth_user_id', 'user-legacy');
    });
  });
});
