import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Perf hotfix testy pre billing-store:
 *  1. Stripe klient sa vytvara s { timeout: 5000, maxNetworkRetries: 1 }.
 *  2. getCurrentBillingStatus je memoizovany — traja volajuci
 *     (getCurrentPlanTier, getCurrentPlanKey, getCurrentBillingStatus)
 *     zdielaju JEDEN Stripe fetch.
 *  3. Pri Stripe chybe/timeoute sa vracia fail-open fallback (free plan)
 *     a memo sa zahodi, takze dalsi request skusi Stripe znova.
 */

const {
  stripeCtor,
  customersList,
  customersRetrieve,
  subscriptionsList,
  invoicesList,
  portalCreate,
  agencyMaybeSingle,
  getCurrentProfile,
} = vi.hoisted(() => {
  const customersList = vi.fn();
  const customersRetrieve = vi.fn();
  const subscriptionsList = vi.fn();
  const invoicesList = vi.fn();
  const portalCreate = vi.fn();
  const agencyMaybeSingle = vi.fn();
  const getCurrentProfile = vi.fn(async () => null as { agency_id?: string } | null);
  const stripeCtor = vi.fn(function StripePlaceholder(this: Record<string, unknown>) {
    this.customers = { list: customersList, retrieve: customersRetrieve };
    this.subscriptions = { list: subscriptionsList };
    this.invoices = { list: invoicesList };
    this.billingPortal = { sessions: { create: portalCreate } };
    return undefined;
  });
  return {
    stripeCtor,
    customersList,
    customersRetrieve,
    subscriptionsList,
    invoicesList,
    portalCreate,
    agencyMaybeSingle,
    getCurrentProfile,
  };
});

vi.mock('stripe', () => ({ default: stripeCtor }));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(async () => ({ id: 'user-1', email: 'agent@example.com' })),
  getCurrentProfile: (...args: unknown[]) => getCurrentProfile(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      if (table === 'agencies') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: agencyMaybeSingle }),
          }),
        };
      }
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
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

async function loadBillingStore() {
  const mod = await import('@/lib/billing-store');
  mod.__resetBillingStatusMemoForTests();
  return mod;
}

describe('billing-store perf hotfix', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_dummy');
    stripeCtor.mockClear();
    getCurrentProfile.mockReset().mockResolvedValue(null);
    agencyMaybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
    customersRetrieve.mockReset();
    portalCreate.mockReset().mockResolvedValue({ url: 'https://billing.stripe.test/session' });
    customersList.mockReset().mockResolvedValue({
      data: [{ id: 'cus_1', email: 'agent@example.com', name: 'Agent' }],
    });
    subscriptionsList.mockReset().mockResolvedValue({ data: [] });
    invoicesList.mockReset().mockResolvedValue({ data: [] });
  });

  it('constructs the Stripe client with a 5s timeout and 1 retry', async () => {
    const { getCurrentBillingStatus } = await loadBillingStore();
    await getCurrentBillingStatus();
    expect(stripeCtor).toHaveBeenCalledWith(
      'sk_test_dummy',
      expect.objectContaining({ timeout: 5000, maxNetworkRetries: 1 })
    );
  });

  it('memoizes billing status — three concurrent callers share ONE Stripe fetch', async () => {
    const mod = await loadBillingStore();
    const [tier, planKey, status] = await Promise.all([
      mod.getCurrentPlanTier(),
      mod.getCurrentPlanKey(),
      mod.getCurrentBillingStatus(),
    ]);
    expect(tier).toBe('free');
    expect(planKey).toBe('free');
    expect(status.hasCustomer).toBe(true);
    expect(customersList).toHaveBeenCalledTimes(1);
    expect(subscriptionsList).toHaveBeenCalledTimes(1);
    expect(invoicesList).toHaveBeenCalledTimes(1);
  });

  it('memoizes billing status for sequential callers within the TTL', async () => {
    const mod = await loadBillingStore();
    await mod.getCurrentBillingStatus();
    await mod.getCurrentPlanKey();
    await mod.getCurrentPlanTier();
    expect(customersList).toHaveBeenCalledTimes(1);
    expect(subscriptionsList).toHaveBeenCalledTimes(1);
  });

  it('fails open to the default (free) plan when Stripe rejects, and retries next call', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const mod = await loadBillingStore();
      customersList.mockRejectedValue(new Error('ETIMEDOUT'));

      const status = await mod.getCurrentBillingStatus();
      expect(status.hasCustomer).toBe(false);
      expect(status.hasSubscription).toBe(false);
      expect(status.invoices).toEqual([]);

      const planKey = await mod.getCurrentPlanKey();
      expect(planKey).toBe('free');
      // Zlyhany fetch sa nememoizuje — druhe volanie skusilo Stripe znova.
      expect(customersList).toHaveBeenCalledTimes(2);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('canceled-only leftover must NOT set hasSubscription (invoice clients stay on paysOutsideStripe)', async () => {
    subscriptionsList.mockResolvedValue({
      data: [
        {
          id: 'sub_canceled',
          status: 'canceled',
          currency: 'eur',
          items: { data: [] },
        },
        {
          id: 'sub_expired',
          status: 'incomplete_expired',
          currency: 'eur',
          items: { data: [] },
        },
      ],
    });
    const { getCurrentBillingStatus } = await loadBillingStore();
    const status = await getCurrentBillingStatus();
    expect(status.hasCustomer).toBe(true);
    expect(status.hasSubscription).toBe(false);
    expect(status.subscription).toBeNull();
  });

  it('prefers active over past_due / incomplete when several statuses exist', async () => {
    subscriptionsList.mockResolvedValue({
      data: [
        {
          id: 'sub_incomplete',
          status: 'incomplete',
          currency: 'eur',
          items: { data: [{ id: 'si_1', price: { id: 'price_1', product: 'prod_1', unit_amount: 0 }, quantity: 1 }] },
        },
        {
          id: 'sub_active',
          status: 'active',
          currency: 'eur',
          items: {
            data: [
              {
                id: 'si_2',
                price: { id: 'price_2', product: 'prod_2', unit_amount: 5000, recurring: { interval: 'month' } },
                quantity: 3,
              },
            ],
          },
        },
      ],
    });
    const { getCurrentBillingStatus } = await loadBillingStore();
    const status = await getCurrentBillingStatus();
    expect(status.hasSubscription).toBe(true);
    expect(status.subscription?.id).toBe('sub_active');
    expect(status.subscription?.status).toBe('active');
  });

  it('prefers agencies.stripe_customer_id over newer email-orphan Customer', async () => {
    getCurrentProfile.mockResolvedValue({ agency_id: 'agency-1' });
    agencyMaybeSingle.mockResolvedValue({
      data: { stripe_customer_id: 'cus_live' },
      error: null,
    });
    customersRetrieve.mockResolvedValue({
      id: 'cus_live',
      email: 'agent@example.com',
      name: 'Live',
    });
    customersList.mockResolvedValue({
      data: [
        { id: 'cus_orphan', email: 'agent@example.com', name: 'Orphan top-up' },
        { id: 'cus_live', email: 'agent@example.com', name: 'Live' },
      ],
    });
    subscriptionsList.mockResolvedValue({
      data: [
        {
          id: 'sub_live',
          status: 'active',
          currency: 'eur',
          items: { data: [] },
        },
      ],
    });

    const mod = await loadBillingStore();
    const status = await mod.getCurrentBillingStatus();
    expect(customersRetrieve).toHaveBeenCalledWith('cus_live');
    expect(customersList).not.toHaveBeenCalled();
    expect(status.customer?.id).toBe('cus_live');
    expect(status.hasSubscription).toBe(true);

    const portal = await mod.createCustomerPortalSession();
    expect(portalCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_live' }),
    );
    expect(portal.url).toBe('https://billing.stripe.test/session');
  });
});
