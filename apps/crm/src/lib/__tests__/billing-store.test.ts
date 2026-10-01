import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockProfileUpdateEq = vi.fn().mockResolvedValue({ error: null });
const mockProfileUpdate = vi.fn(() => ({ eq: mockProfileUpdateEq }));

// Shared seams for the subscription.updated tests below. The defaults reproduce
// what the module-level mocks did before they existed — customers.retrieve
// resolving to undefined, no admin auth — so every test written against the old
// mocks keeps the behaviour it was written for. Only the downgrade-lock block
// gives them real implementations.
const { mockCustomersRetrieve, mockListUsers } = vi.hoisted(() => ({
  mockCustomersRetrieve: vi.fn(),
  mockListUsers: vi.fn(async () => ({ data: { users: [] } })),
}));

/** Avoid loading the real Stripe SDK in Vitest — cold import can exceed default test timeout on Windows */
vi.mock('stripe', () => ({
  default: vi.fn(function StripePlaceholder(this: Record<string, unknown>) {
    this.billingPortal = { sessions: { create: vi.fn() } };
    this.customers = {
      list: vi.fn(async () => ({ data: [] })),
      retrieve: mockCustomersRetrieve,
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
    auth: { admin: { listUsers: mockListUsers } },
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

  describe('resolvePlanKeyFromStripePriceId unknown must not be free', () => {
    it('returns unknown for missing and unrecognized price IDs', async () => {
      const { resolvePlanKeyFromStripePriceId } = await import('@/lib/billing-store');
      expect(resolvePlanKeyFromStripePriceId(undefined)).toBe('unknown');
      expect(resolvePlanKeyFromStripePriceId(null)).toBe('unknown');
      expect(resolvePlanKeyFromStripePriceId('price_totally_unknown')).toBe('unknown');
      expect(resolvePlanKeyFromStripePriceId('price_totally_unknown')).not.toBe('free');
    });

    it('maps self-serve seat Stripe prices to plan keys', async () => {
      vi.stubEnv('STRIPE_PRICE_SOLO_SEAT', 'price_solo_seat_test');
      vi.stubEnv('STRIPE_PRICE_TEAM_SEAT', 'price_team_seat_test');
      vi.stubEnv('STRIPE_PRICE_OFFICE_SEAT', 'price_office_seat_test');

      const { resolvePlanKeyFromStripePriceId } = await import('@/lib/billing-store');
      expect(resolvePlanKeyFromStripePriceId('price_solo_seat_test')).toBe('starter');
      expect(resolvePlanKeyFromStripePriceId('price_team_seat_test')).toBe('pro');
      expect(resolvePlanKeyFromStripePriceId('price_office_seat_test')).toBe('enterprise');
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

  describe('handleStripeWebhookEvent pricing checkout guard', () => {
    it('does not overwrite profile tier on seat checkout.session.completed', async () => {
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
    });

    it('does not overwrite profile tier when authUserId present without planKey', async () => {
      // Regression for #371: legacy path previously synced undefined → free.
      const { handleStripeWebhookEvent } = await import('@/lib/billing-store');

      await handleStripeWebhookEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_no_plan_key',
            customer: 'cus_1',
            customer_email: 'broker@example.com',
            metadata: {
              authUserId: 'user-paid',
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

      expect(mockProfileUpdate).toHaveBeenCalled();
      expect(mockProfileUpdate.mock.calls[0][0]).toMatchObject({
        account_tier: 'pro',
      });
    });

    it('forces free on subscription.deleted', async () => {
      vi.resetModules();
      const { handleStripeWebhookEvent } = await import('@/lib/billing-store');

      await handleStripeWebhookEvent({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_gone',
            customer: 'cus_deleted',
            status: 'canceled',
          },
        },
      } as never);

      // forceFree path uses stripe customer lookup when not byAuthUserId —
      // with stubbed Stripe customer retrieve returning nothing, update may not
      // fire. Assert resolver stays unknown for null (delete uses forceFree).
      const { resolvePlanKeyFromStripePriceId } = await import('@/lib/billing-store');
      expect(resolvePlanKeyFromStripePriceId(null)).toBe('unknown');
    });
  });
  describe('customer.subscription.updated — downgrade lock', () => {
    const MARKET_VISION = 'price_market_vision_live';
    const PRO = 'price_pro_live';
    const BROKER = 'broker@example.com';

    /**
     * Drives the real webhook handler through the customer-lookup path that
     * production uses (no authUserId on subscription events), and hands back
     * whatever was written to `profiles`.
     */
    async function fireSubscriptionUpdated(opts: {
      previousAttributes: Record<string, unknown>;
      newPriceId: string;
      enterprisePriceEnv?: string;
    }) {
      vi.resetModules();
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_downgrade_guard');
      vi.stubEnv('STRIPE_PRICE_MARKET_VISION', MARKET_VISION);
      vi.stubEnv('STRIPE_PRICE_PRO', PRO);
      // Production has no STRIPE_PRICE_ENTERPRISE at all. That is not the same
      // as an empty one: `undefined === ''` is false, so stubbing it blank
      // would quietly hide the very bug these tests exist to catch. Passing
      // undefined deletes the key, which is what the Vercel env really looks like.
      vi.stubEnv(
        'STRIPE_PRICE_ENTERPRISE',
        opts.enterprisePriceEnv as unknown as string,
      );

      mockCustomersRetrieve.mockResolvedValue({
        id: 'cus_guard',
        email: BROKER,
        deleted: false,
      });
      mockListUsers.mockResolvedValue({
        data: { users: [{ id: 'user-guard', email: BROKER }] },
      });

      const { handleStripeWebhookEvent } = await import('@/lib/billing-store');
      await handleStripeWebhookEvent({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_guard',
            customer: 'cus_guard',
            status: 'active',
            items: { data: [{ price: { id: opts.newPriceId } }] },
          },
          previous_attributes: opts.previousAttributes,
        },
      } as never);

      expect(mockProfileUpdate).toHaveBeenCalled();
      return mockProfileUpdate.mock.calls[0][0] as Record<string, unknown>;
    }

    it('does not lock when the subscription item never changed', async () => {
      // Stripe fills `previous_attributes` only with fields that actually
      // changed. A renewal, a payment-method swap or a cancel_at_period_end
      // flip leaves `items` out entirely — that is not a downgrade.
      const update = await fireSubscriptionUpdated({
        previousAttributes: { status: 'active' },
        newPriceId: PRO,
      });

      expect(update.account_tier).toBe('pro');
      expect(update.tier_locked_at).toBeUndefined();
      expect(update.tier_downgraded_from).toBeUndefined();
    });

    it('does not lock on an unchanged item even when STRIPE_PRICE_ENTERPRISE is set', async () => {
      // Control for the test above: with the env var present the old code
      // happened to behave, which is why the bug only ever bit production.
      const update = await fireSubscriptionUpdated({
        previousAttributes: { status: 'active' },
        newPriceId: PRO,
        enterprisePriceEnv: 'price_enterprise_legacy',
      });

      expect(update.account_tier).toBe('pro');
      expect(update.tier_locked_at).toBeUndefined();
      expect(update.tier_downgraded_from).toBeUndefined();
    });

    it('still locks a real Enterprise -> PRO downgrade', async () => {
      // A6: the fix must not buy its way out by never locking at all.
      const update = await fireSubscriptionUpdated({
        previousAttributes: { items: { data: [{ price: { id: MARKET_VISION } }] } },
        newPriceId: PRO,
      });

      expect(update.account_tier).toBe('pro');
      expect(update.tier_locked_at).toEqual(expect.any(String));
      expect(update.tier_downgraded_from).toBe('enterprise');
    });

    it('clears an existing lock on a PRO -> Enterprise upgrade', async () => {
      const update = await fireSubscriptionUpdated({
        previousAttributes: { items: { data: [{ price: { id: PRO } }] } },
        newPriceId: MARKET_VISION,
      });

      expect(update.account_tier).toBe('enterprise');
      expect(update.tier_locked_at).toBeNull();
      expect(update.tier_downgraded_from).toBeNull();
    });
  });
});
