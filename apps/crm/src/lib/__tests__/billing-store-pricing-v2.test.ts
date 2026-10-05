import { beforeEach, describe, expect, it, vi } from "vitest";

// Pasca 1 z kontraktu: subscription.created/updated/deleted s v2 price ID nesmú zavolať syncAccountTier
// (ten by neznáme price ID zhodil na "free" alebo by hľadal zákazníka v Stripe).

const h = vi.hoisted(() => ({
  customersRetrieve: vi.fn(),
  listUsers: vi.fn(async (): Promise<{ data: { users: Array<{ id: string; email: string }> } }> => ({ data: { users: [] } })),
  profileUpdate: vi.fn(),
  agencyUpdates: [] as Array<Record<string, unknown>>,
  agencies: [] as Array<Record<string, unknown>>,
  updateError: null as { message: string } | null,
}));

vi.mock("stripe", () => ({
  default: vi.fn(function StripePlaceholder(this: Record<string, unknown>) {
    this.customers = { list: vi.fn(async () => ({ data: [] })), retrieve: h.customersRetrieve };
    return undefined;
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabaseClient: { auth: { getUser: () => ({ data: { user: null } }) }, from: () => ({}) },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    auth: { admin: { listUsers: h.listUsers } },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          update: (payload: Record<string, unknown>) => ({
            eq: async () => {
              h.profileUpdate(payload);
              return { error: null };
            },
          }),
        };
      }
      if (table === "agencies") {
        return {
          select: () => ({
            eq: (_c: string, v: unknown) => ({
              maybeSingle: async () => ({ data: h.agencies.find((a) => a.stripe_subscription_id === v) ?? null, error: null }),
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: async () => {
              h.agencyUpdates.push(payload);
              return { error: h.updateError };
            },
          }),
        };
      }
      return {};
    },
  }),
}));

vi.mock("@/lib/auto-error-capture", () => ({ autoErrorCapture: vi.fn() }));
vi.mock("@/lib/activities-store", () => ({ createActivity: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/logger", () => ({ logInfo: vi.fn() }));

const V2 = {
  STRIPE_PRICE_V2_START: "price_1Abcdefgh12341",
  STRIPE_PRICE_V2_TEAM: "price_1Abcdefgh12342",
  STRIPE_PRICE_V2_OFFICE: "price_1Abcdefgh12343",
  STRIPE_PRICE_V2_PACK_120: "price_1Abcdefgh12346",
};
const LEGACY_PRO = "price_1LegacyPro0001";

function subEvent(type: string, priceIds: string[], extra: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    type,
    data: {
      object: {
        id: "sub_1",
        customer: "cus_1",
        status: "active",
        items: { data: priceIds.map((id) => ({ price: { id } })) },
        ...extra,
      },
    },
  } as never;
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  h.agencyUpdates = [];
  h.updateError = null;
  h.agencies = [
    { id: "agency-1", pricing_model: "v2", licensed_users: 3, stripe_subscription_id: "sub_1" },
  ];
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_synthetic");
  vi.stubEnv("STRIPE_PRICE_PRO", LEGACY_PRO);
  for (const [k, v] of Object.entries(V2)) vi.stubEnv(k, v);
  h.customersRetrieve.mockResolvedValue({ id: "cus_1", email: "broker@example.test", deleted: false });
  h.listUsers.mockResolvedValue({ data: { users: [{ id: "user-1", email: "broker@example.test" }] } });
});

describe("billing-store: v2 subscription events bypass syncAccountTier (kritérium 4)", () => {
  it.each(["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"])(
    "%s with a v2 price never touches profiles or looks the customer up",
    async (type) => {
      const { handleStripeWebhookEvent } = await import("@/lib/billing-store");
      await handleStripeWebhookEvent(subEvent(type, [V2.STRIPE_PRICE_V2_PACK_120, V2.STRIPE_PRICE_V2_TEAM]));
      expect(h.customersRetrieve).not.toHaveBeenCalled();
      expect(h.listUsers).not.toHaveBeenCalled();
    },
  );

  it("updated with a v2 price changes the band through the v2 handler", async () => {
    const { handleStripeWebhookEvent } = await import("@/lib/billing-store");
    await handleStripeWebhookEvent(subEvent("customer.subscription.updated", [V2.STRIPE_PRICE_V2_OFFICE]));
    expect(h.agencyUpdates).toHaveLength(1);
    expect(h.agencyUpdates[0]).toMatchObject({ pricing_band: "office", subscription_status: "active", licensed_users: 7 });
  });

  it("deleted with a v2 price marks the agency canceled", async () => {
    const { handleStripeWebhookEvent } = await import("@/lib/billing-store");
    await handleStripeWebhookEvent(subEvent("customer.subscription.deleted", [V2.STRIPE_PRICE_V2_TEAM], { status: "canceled" }));
    expect(h.agencyUpdates[0]).toMatchObject({ subscription_status: "canceled", account_tier: "free" });
  });

  it("a failing v2 sync is thrown to the route (Stripe retries), not swallowed", async () => {
    h.updateError = { message: "boom" };
    const { handleStripeWebhookEvent } = await import("@/lib/billing-store");
    await expect(
      handleStripeWebhookEvent(subEvent("customer.subscription.updated", [V2.STRIPE_PRICE_V2_TEAM])),
    ).rejects.toThrow(/Pricing v2/);
  });

  it("legacy subscription events still go through syncAccountTier exactly as before (kritérium 1)", async () => {
    const { handleStripeWebhookEvent } = await import("@/lib/billing-store");
    await handleStripeWebhookEvent(subEvent("customer.subscription.updated", [LEGACY_PRO]));
    expect(h.customersRetrieve).toHaveBeenCalledWith("cus_1");
    expect(h.profileUpdate).toHaveBeenCalledWith(expect.objectContaining({ account_tier: "pro" }));
    expect(h.agencyUpdates).toHaveLength(0);

    h.profileUpdate.mockClear();
    await handleStripeWebhookEvent(subEvent("customer.subscription.deleted", [LEGACY_PRO], { status: "canceled" }));
    expect(h.profileUpdate).toHaveBeenCalledWith(expect.objectContaining({ account_tier: "free" }));
    expect(h.agencyUpdates).toHaveLength(0);
  });

  it("with v2 env vars UNSET (flag-off deployment) a legacy event is unaffected and an unknown price stays a no-op", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_synthetic");
    vi.stubEnv("STRIPE_PRICE_PRO", LEGACY_PRO);
    const { handleStripeWebhookEvent } = await import("@/lib/billing-store");
    await handleStripeWebhookEvent(subEvent("customer.subscription.updated", [LEGACY_PRO]));
    expect(h.profileUpdate).toHaveBeenCalledWith(expect.objectContaining({ account_tier: "pro" }));
    h.profileUpdate.mockClear();
    await handleStripeWebhookEvent(subEvent("customer.subscription.updated", ["price_1SomethingElse1"]));
    expect(h.profileUpdate).not.toHaveBeenCalled();
    expect(h.agencyUpdates).toHaveLength(0);
  });

  it("isPricingCheckoutMetadata recognises the v2 checkout types, so legacy sync is skipped for them", async () => {
    const { isPricingCheckoutMetadata, handleStripeWebhookEvent } = await import("@/lib/billing-store");
    expect(isPricingCheckoutMetadata({ checkoutType: "pricing_v2" })).toBe(true);
    expect(isPricingCheckoutMetadata({ checkoutType: "pricing_v2_credits" })).toBe(true);
    expect(isPricingCheckoutMetadata({ checkoutType: "pricing_v3" })).toBe(false);
    await handleStripeWebhookEvent({
      id: "evt_c",
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", customer: "cus_1", metadata: { checkoutType: "pricing_v2", authUserId: "user-1" } } },
    } as never);
    expect(h.profileUpdate).not.toHaveBeenCalled();
  });
});
