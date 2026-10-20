import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

/**
 * Cenník v2 × životný cyklus predplatného (`syncAgencyBillingLifecycle`).
 *
 * Lifecycle prišiel na `main` nezávisle od W2. Zisťuje seaty len zo seat price ID,
 * takže v2 predplatné (quantity = 1, iné price ID) nesmie prepísať počet povolených
 * používateľov ani tier; smie meniť stav a pri zrušení odobrať plán.
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
  pricing_model: string | null;
  pricing_band: string | null;
  licensed_users: number | null;
  pack_credits: number;
};

let agencies: Agency[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      if (table !== "agencies") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: (col: keyof Agency, value: unknown) => ({
            maybeSingle: async () => ({ data: agencies.find((a) => a[col] === value) ?? null, error: null }),
          }),
        }),
        update: (patch: Partial<Agency>) => ({
          eq: async (col: keyof Agency, value: unknown) => {
            const row = agencies.find((a) => a[col] === value);
            if (row) Object.assign(row, patch);
            return { error: null };
          },
        }),
      };
    },
  }),
}));

import { syncAgencyBillingLifecycle } from "@/lib/billing-lifecycle";

const V3_SEAT_PRICE = "price_1V3seatMonthly01";
const SEAT_TEAM_PRICE = "price_1SeatTeamAbcdef";

function v2Agency(over: Partial<Agency> = {}): Agency {
  return {
    id: "agency-v2",
    stripe_customer_id: "cus_v2",
    stripe_subscription_id: "sub_v2",
    account_tier: "pro",
    subscription_status: "active",
    seats: 4,
    owner_cockpit_active: false,
    cockpit_tier: null,
    billing_updated_at: null,
    pricing_model: "v2",
    pricing_band: "team",
    licensed_users: 4,
    pack_credits: 50,
    ...over,
  };
}

function stripeWith(status: string, priceId = V3_SEAT_PRICE, quantity = 4) {
  return {
    subscriptions: {
      retrieve: async () =>
        ({
          id: "sub_v2",
          status,
          customer: "cus_v2",
          items: { data: [{ price: { id: priceId }, quantity }] },
        }) as unknown as Stripe.Subscription,
    },
  };
}

function subEvent(type: string): Stripe.Event {
  // Faktúry nesú odkaz na predplatné v poli `subscription`; udalosti predplatného majú vlastné `id`.
  const object = type.startsWith("invoice.") ? { subscription: "sub_v2" } : { id: "sub_v2" };
  return { id: "evt_1", type, data: { object } } as unknown as Stripe.Event;
}

beforeEach(() => {
  agencies = [v2Agency()];
  vi.stubEnv("STRIPE_PRICE_V3_SEAT_MONTHLY", V3_SEAT_PRICE);
  vi.stubEnv("STRIPE_PRICE_TEAM_SEAT", SEAT_TEAM_PRICE);
});

describe("lifecycle × cenník v2", () => {
  it("aktívne v3 predplatné (quantity 4) nezmení počet povolených používateľov ani tier", async () => {
    const result = await syncAgencyBillingLifecycle(subEvent("customer.subscription.updated"), {
      stripe: stripeWith("active"),
    });
    expect(result).toMatchObject({ applied: true, agencyId: "agency-v2", status: "active", revoked: false });
    expect(agencies[0]).toMatchObject({
      seats: 4,
      licensed_users: 4,
      account_tier: "pro",
      pricing_model: "v2",
      pricing_band: "team",
      pack_credits: 50,
      subscription_status: "active",
    });
  });

  it("past_due len zapíše stav; plán a pásmo ostanú (granty zastaví podmienka stavu)", async () => {
    await syncAgencyBillingLifecycle(subEvent("invoice.payment_failed"), { stripe: stripeWith("past_due") });
    expect(agencies[0]).toMatchObject({ subscription_status: "past_due", account_tier: "pro", pricing_band: "team", seats: 4 });
  });

  it("zrušenie v2 predplatného odoberie plán a nezmaže evidenciu pásma", async () => {
    const result = await syncAgencyBillingLifecycle(subEvent("customer.subscription.deleted"), {
      stripe: stripeWith("canceled"),
    });
    expect(result).toMatchObject({ applied: true, revoked: true, status: "canceled" });
    expect(agencies[0]).toMatchObject({
      account_tier: "free",
      subscription_status: "canceled",
      pricing_model: "v2",
      pricing_band: "team",
    });
  });

  it("legacy seat predplatné sa správa ako doteraz (seaty z quantity, tier z cenníka)", async () => {
    agencies = [
      v2Agency({ id: "agency-legacy", pricing_model: null, pricing_band: null, licensed_users: null, pack_credits: 0, seats: 3, account_tier: "starter" }),
    ];
    const stripe = stripeWith("active", SEAT_TEAM_PRICE, 5);
    await syncAgencyBillingLifecycle(subEvent("customer.subscription.updated"), { stripe });
    expect(agencies[0]).toMatchObject({ seats: 5, account_tier: "pro", pricing_model: null });
  });

  it("cudzie predplatné toho istého zákazníka nezruší v2 kancelárii", async () => {
    const other = { id: "sub_other", status: "canceled", customer: "cus_v2", items: { data: [] } };
    const result = await syncAgencyBillingLifecycle(
      { id: "evt_2", type: "customer.subscription.deleted", data: { object: { id: "sub_other" } } } as unknown as Stripe.Event,
      { stripe: { subscriptions: { retrieve: async () => other as unknown as Stripe.Subscription } } },
    );
    expect(result).toEqual({ applied: false, reason: "other_subscription" });
    expect(agencies[0]).toMatchObject({ account_tier: "pro", subscription_status: "active" });
  });
});
