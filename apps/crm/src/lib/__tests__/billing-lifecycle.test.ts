import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * PLATBY-E2E: webhook → `agencies`. Test ide cez skutočný route handler; mockuje sa
 * len Stripe (stav predplatného), podpis a databáza v pamäti.
 */

type Agency = {
  id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  account_tier: string | null;
  subscription_status: string | null;
  seats: number;
  owner_cockpit_active: boolean;
  cockpit_tier: string | null;
  billing_updated_at: string | null;
};

let agencies: Agency[] = [];
let updateError: { message: string } | null = null;
let lookupCalls = 0;

const mockVerify = vi.fn();
const mockRetrieve = vi.fn();
const mockLegacy = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      if (table !== "agencies") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: (col: keyof Agency, value: unknown) => ({
            maybeSingle: async () => {
              lookupCalls += 1;
              return { data: agencies.find((a) => a[col] === value) ?? null, error: null };
            },
          }),
        }),
        update: (patch: Partial<Agency>) => ({
          eq: async (col: keyof Agency, value: unknown) => {
            if (updateError) return { error: updateError };
            const row = agencies.find((a) => a[col] === value);
            if (row) Object.assign(row, patch);
            return { error: null };
          },
        }),
      };
    },
  }),
}));

vi.mock("stripe", () => ({
  default: class {
    subscriptions = { retrieve: (...args: unknown[]) => mockRetrieve(...args) };
  },
}));

vi.mock("@/lib/billing-store", () => ({
  verifyStripeWebhook: (...args: unknown[]) => mockVerify(...args),
  handleStripeWebhookEvent: (...args: unknown[]) => mockLegacy(...args),
}));

vi.mock("@/lib/credits-billing-webhook", () => ({
  handlePricingCheckoutWebhook: async () => false,
}));

vi.mock("@/lib/auto-error-capture", () => ({
  autoErrorCapture: (error: unknown) => ({
    error: error instanceof Error ? error.message : "error",
  }),
}));

function subscription(over: {
  id?: string;
  status: string;
  priceId?: string;
  quantity?: number;
  customer?: string;
}) {
  return {
    id: over.id ?? "sub_1",
    status: over.status,
    customer: over.customer ?? "cus_1",
    items: { data: [{ price: { id: over.priceId ?? "price_team" }, quantity: over.quantity ?? 4 }] },
  };
}

function event(type: string, object: Record<string, unknown>) {
  return { id: `evt_${type}`, type, data: { object } };
}

async function deliver(ev: unknown) {
  mockVerify.mockReturnValue(ev);
  const { POST } = await import("@/app/api/billing/webhook/route");
  return POST(
    new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig_test" },
      body: "{}",
    }),
  );
}

function paying(): Agency {
  return {
    id: "agency-1",
    stripe_customer_id: "cus_1",
    stripe_subscription_id: "sub_1",
    account_tier: "pro",
    subscription_status: "active",
    seats: 4,
    owner_cockpit_active: false,
    cockpit_tier: "lite",
    billing_updated_at: "2026-10-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
  vi.stubEnv("STRIPE_PRICE_SOLO_SEAT", "price_solo");
  vi.stubEnv("STRIPE_PRICE_TEAM_SEAT", "price_team");
  vi.stubEnv("STRIPE_PRICE_OFFICE_SEAT", "price_office");
  agencies = [paying()];
  updateError = null;
  lookupCalls = 0;
  mockLegacy.mockResolvedValue(undefined);
});

describe("webhook životný cyklus → agencies", () => {
  it("zrušenie predplatného odoberie plán, miesta ostanú len ako história a cockpit sa vypne", async () => {
    agencies[0].owner_cockpit_active = true;
    agencies[0].cockpit_tier = "owner";
    mockRetrieve.mockResolvedValue(subscription({ status: "canceled" }));

    const res = await deliver(event("customer.subscription.deleted", { id: "sub_1", customer: "cus_1" }));

    expect(res.status).toBe(200);
    expect(agencies[0]).toMatchObject({
      subscription_status: "canceled",
      account_tier: "free",
      owner_cockpit_active: false,
      cockpit_tier: null,
    });
    expect(mockLegacy).toHaveBeenCalledTimes(1);
  });

  it("zmena počtu miest zo Stripe portálu sa premietne do seats a cockpitu", async () => {
    mockRetrieve.mockResolvedValue(subscription({ status: "active", quantity: 8 }));

    await deliver(event("customer.subscription.updated", { id: "sub_1", customer: "cus_1" }));

    expect(agencies[0]).toMatchObject({
      seats: 8,
      account_tier: "pro",
      cockpit_tier: "lite",
      subscription_status: "active",
    });
  });

  it("zmena balíka (Team → Solo) zmení tier a zruší lite cockpit pod minimom miest", async () => {
    mockRetrieve.mockResolvedValue(subscription({ status: "active", priceId: "price_solo", quantity: 1 }));

    await deliver(event("customer.subscription.updated", { id: "sub_1", customer: "cus_1" }));

    expect(agencies[0]).toMatchObject({ seats: 1, account_tier: "starter", cockpit_tier: null });
  });

  it("zlyhaná platba uloží past_due, ale plán neodoberie (Stripe ešte opakuje)", async () => {
    mockRetrieve.mockResolvedValue(subscription({ status: "past_due" }));

    await deliver(event("invoice.payment_failed", { id: "in_1", subscription: "sub_1", customer: "cus_1" }));

    expect(agencies[0]).toMatchObject({ subscription_status: "past_due", account_tier: "pro", seats: 4 });
  });

  it("nový tvar faktúry (parent.subscription_details) sa číta rovnako", async () => {
    mockRetrieve.mockResolvedValue(subscription({ status: "past_due" }));

    await deliver(
      event("invoice.payment_failed", {
        id: "in_2",
        parent: { subscription_details: { subscription: "sub_1" } },
      }),
    );

    expect(agencies[0].subscription_status).toBe("past_due");
  });

  it("unpaid (Stripe vzdal opakovanie) plán odoberie", async () => {
    mockRetrieve.mockResolvedValue(subscription({ status: "unpaid" }));

    await deliver(event("customer.subscription.updated", { id: "sub_1", customer: "cus_1" }));

    expect(agencies[0]).toMatchObject({ subscription_status: "unpaid", account_tier: "free" });
  });

  it("neznáme predplatné nič nemení a odpovie 200", async () => {
    mockRetrieve.mockResolvedValue(subscription({ id: "sub_cudzie", customer: "cus_cudzi", status: "canceled" }));
    const before = JSON.stringify(agencies);

    const res = await deliver(event("customer.subscription.deleted", { id: "sub_cudzie", customer: "cus_cudzi" }));

    expect(res.status).toBe(200);
    expect(JSON.stringify(agencies)).toBe(before);
  });

  it("staré zrušené predplatné toho istého zákazníka neodoberie plán, ak kancelárii platí iné", async () => {
    agencies[0].stripe_subscription_id = "sub_2";
    mockRetrieve.mockResolvedValue(subscription({ id: "sub_1", status: "canceled" }));

    await deliver(event("customer.subscription.deleted", { id: "sub_1", customer: "cus_1" }));

    expect(agencies[0]).toMatchObject({ account_tier: "pro", subscription_status: "active" });
  });

  it("opakovaná udalosť nechá rovnaký stav", async () => {
    mockRetrieve.mockResolvedValue(subscription({ status: "canceled" }));
    const ev = event("customer.subscription.deleted", { id: "sub_1", customer: "cus_1" });

    await deliver(ev);
    const once = { ...agencies[0], billing_updated_at: null };
    await deliver(ev);

    expect({ ...agencies[0], billing_updated_at: null }).toEqual(once);
  });

  it("udalosti mimo poradia rozhoduje aktuálny stav zo Stripe, nie obsah starej udalosti", async () => {
    mockRetrieve.mockResolvedValue(subscription({ status: "canceled" }));

    await deliver(event("customer.subscription.deleted", { id: "sub_1", customer: "cus_1" }));
    // Oneskorená stará udalosť tvrdí „active", ale Stripe už hlási zrušené.
    await deliver(
      event("customer.subscription.updated", { id: "sub_1", customer: "cus_1", status: "active" }),
    );

    expect(agencies[0]).toMatchObject({ subscription_status: "canceled", account_tier: "free" });
  });

  it("zlyhaný zápis vráti 500 (Stripe zopakuje) a neznačí udalosť ako spracovanú", async () => {
    updateError = { message: "db down" };
    mockRetrieve.mockResolvedValue(subscription({ status: "canceled" }));

    const res = await deliver(event("customer.subscription.deleted", { id: "sub_1", customer: "cus_1" }));

    expect(res.status).toBe(500);
    expect(mockLegacy).not.toHaveBeenCalled();
    expect(agencies[0].account_tier).toBe("pro");
  });

  it("nedostupný Stripe pri overení stavu vráti 500 a nezmení nič", async () => {
    mockRetrieve.mockRejectedValue(new Error("Stripe timeout"));

    const res = await deliver(event("customer.subscription.updated", { id: "sub_1", customer: "cus_1" }));

    expect(res.status).toBe(500);
    expect(agencies[0].account_tier).toBe("pro");
  });

  it("zmazané predplatné, ktoré Stripe už nevydá, sa berie z udalosti", async () => {
    mockRetrieve.mockRejectedValue(Object.assign(new Error("No such subscription"), { code: "resource_missing" }));

    await deliver(
      event("customer.subscription.deleted", { id: "sub_1", customer: "cus_1", status: "canceled" }),
    );

    expect(agencies[0]).toMatchObject({ subscription_status: "canceled", account_tier: "free" });
  });

  it("udalosť mimo životného cyklu sa nedotkne ani Stripe, ani databázy", async () => {
    const res = await deliver(event("checkout.session.completed", { id: "cs_1", metadata: {} }));

    expect(res.status).toBe(200);
    expect(mockRetrieve).not.toHaveBeenCalled();
    expect(lookupCalls).toBe(0);
  });
});

describe("checkout-config hlási webhook secret len ako boolean", () => {
  it("bez secretu false, so secretom true, hodnota sa nikdy nevráti", async () => {
    const { GET } = await import("@/app/api/billing/checkout-config/route");

    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect((await (await GET()).json()).webhookSecretConfigured).toBe(false);

    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_TAJNA_HODNOTA");
    const body = await (await GET()).json();
    expect(body.webhookSecretConfigured).toBe(true);
    expect(JSON.stringify(body)).not.toContain("whsec_TAJNA_HODNOTA");
  });
});
