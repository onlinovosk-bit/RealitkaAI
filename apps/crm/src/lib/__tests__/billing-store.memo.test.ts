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

const { stripeCtor, customersList, subscriptionsList, invoicesList } = vi.hoisted(() => {
  const customersList = vi.fn();
  const subscriptionsList = vi.fn();
  const invoicesList = vi.fn();
  const stripeCtor = vi.fn(function StripePlaceholder(this: Record<string, unknown>) {
    this.customers = { list: customersList, retrieve: vi.fn() };
    this.subscriptions = { list: subscriptionsList };
    this.invoices = { list: invoicesList };
    this.billingPortal = { sessions: { create: vi.fn() } };
    return undefined;
  });
  return { stripeCtor, customersList, subscriptionsList, invoicesList };
});

vi.mock('stripe', () => ({ default: stripeCtor }));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(async () => ({ id: 'user-1', email: 'agent@example.com' })),
  getCurrentProfile: vi.fn(async () => null),
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
});
