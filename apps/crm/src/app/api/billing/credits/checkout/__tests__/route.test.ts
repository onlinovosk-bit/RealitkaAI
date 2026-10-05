import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  createV2: vi.fn(),
  createSeat: vi.fn(),
  createTopup: vi.fn(),
}));

vi.mock("@/lib/credits-billing-v2", async () => {
  const actual = await vi.importActual<typeof import("@/lib/credits-billing-v2")>("@/lib/credits-billing-v2");
  return { ...actual, createPricingV2CheckoutSession: (...a: unknown[]) => h.createV2(...a) };
});

vi.mock("@/lib/credits-billing", async () => {
  const actual = await vi.importActual<typeof import("@/lib/credits-billing")>("@/lib/credits-billing");
  return {
    ...actual,
    createSeatCheckoutSession: (...a: unknown[]) => h.createSeat(...a),
    createTopupCheckoutSession: (...a: unknown[]) => h.createTopup(...a),
  };
});

const SEAT_ENV = {
  STRIPE_PRICE_SOLO_SEAT: "price_1Abcdefgh00001",
  STRIPE_PRICE_TEAM_SEAT: "price_1Abcdefgh00002",
  STRIPE_PRICE_OFFICE_SEAT: "price_1Abcdefgh00003",
  STRIPE_PRICE_CREDITS_START: "price_1Abcdefgh00004",
  STRIPE_PRICE_CREDITS_RAST: "price_1Abcdefgh00005",
  STRIPE_PRICE_CREDITS_PRO: "price_1Abcdefgh00006",
  STRIPE_PRICE_CREDITS_MEGA: "price_1Abcdefgh00007",
};
const V2_ENV: Record<string, string> = {
  STRIPE_PRICE_V2_START: "price_1Abcdefgh12341",
  STRIPE_PRICE_V2_TEAM: "price_1Abcdefgh12342",
  STRIPE_PRICE_V2_OFFICE: "price_1Abcdefgh12343",
  STRIPE_PRICE_V2_NETWORK: "price_1Abcdefgh12344",
  STRIPE_PRICE_V2_PACK_60: "price_1Abcdefgh12345",
  STRIPE_PRICE_V2_PACK_120: "price_1Abcdefgh12346",
  STRIPE_PRICE_V2_PACK_180: "price_1Abcdefgh12347",
  STRIPE_PRICE_V2_PACK_240: "price_1Abcdefgh12348",
  STRIPE_PRICE_V2_PACK_300: "price_1Abcdefgh12349",
  STRIPE_PRICE_V2_CREDIT: "price_1Abcdefgh12350",
};

async function call(body: unknown) {
  const { POST } = await import("@/app/api/billing/credits/checkout/route");
  return POST(new Request("http://localhost/api/billing/credits/checkout", { method: "POST", body: JSON.stringify(body) }));
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  for (const [k, v] of Object.entries(SEAT_ENV)) vi.stubEnv(k, v);
  h.createSeat.mockResolvedValue({ id: "cs_seat", url: "https://stripe.test/seat" });
  h.createTopup.mockResolvedValue({ id: "cs_topup", url: "https://stripe.test/topup" });
  h.createV2.mockResolvedValue({ kind: "ok", result: { id: "cs_v2", url: "https://stripe.test/v2" } });
});

describe("POST /api/billing/credits/checkout — PRICING_V2_ENABLED vypnuté (kritérium 1)", () => {
  it("legacy seat checkout is unchanged", async () => {
    const res = await call({ checkoutType: "seat", seatTier: "team", quantity: 3 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, result: { id: "cs_seat", url: "https://stripe.test/seat" } });
    expect(h.createSeat).toHaveBeenCalledWith({ seatTier: "team", quantity: 3, includeOwnerCockpit: false });
    expect(h.createV2).not.toHaveBeenCalled();
  });

  it("legacy top-up checkout is unchanged", async () => {
    const res = await call({ checkoutType: "topup", topupPackage: "rast" });
    expect(res.status).toBe(200);
    expect(h.createTopup).toHaveBeenCalledWith("rast");
    expect(h.createV2).not.toHaveBeenCalled();
  });

  it("unknown / legacy typed body still gets the old 400", async () => {
    const res = await call({ checkoutType: "legacy", planKey: "pro" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Neplatný checkout typ.");
  });

  it("v2 checkout types are 404 pricing_v2_disabled and never reach Stripe (valid or invalid body)", async () => {
    for (const body of [
      { checkoutType: "pricing_v2", users: 3, packCredits: null },
      { checkoutType: "pricing_v2", users: 0 },
      { checkoutType: "pricing_v2_credits", credits: 10 },
      { checkoutType: "pricing_v2_credits", credits: -1 },
    ]) {
      const res = await call(body);
      expect(res.status).toBe(404);
      expect((await res.json()).code).toBe("pricing_v2_disabled");
    }
    expect(h.createV2).not.toHaveBeenCalled();
  });

  it.each(["", "false", "0", "off", "yes"])("PRICING_V2_ENABLED=%j counts as disabled", async (value) => {
    vi.stubEnv("PRICING_V2_ENABLED", value);
    const res = await call({ checkoutType: "pricing_v2", users: 3 });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/billing/credits/checkout — PRICING_V2_ENABLED zapnuté", () => {
  beforeEach(() => {
    vi.stubEnv("PRICING_V2_ENABLED", "true");
    for (const [k, v] of Object.entries(V2_ENV)) vi.stubEnv(k, v);
  });

  it("legacy bodies still use the legacy path even when v2 is on", async () => {
    const res = await call({ checkoutType: "seat", seatTier: "solo", quantity: 1 });
    expect(res.status).toBe(200);
    expect(h.createSeat).toHaveBeenCalled();
    expect(h.createV2).not.toHaveBeenCalled();
  });

  it("plan checkout returns the Stripe session in the standard envelope", async () => {
    const res = await call({ checkoutType: "pricing_v2", users: 3, packCredits: 120 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, result: { id: "cs_v2", url: "https://stripe.test/v2" } });
    expect(h.createV2).toHaveBeenCalledWith({ checkoutType: "pricing_v2", users: 3, packCredits: 120 });
  });

  it("credits checkout returns the Stripe session", async () => {
    const res = await call({ checkoutType: "pricing_v2_credits", credits: 25 });
    expect(res.status).toBe(200);
    expect(h.createV2).toHaveBeenCalledWith({ checkoutType: "pricing_v2_credits", credits: 25 });
  });

  it("invalid input is 400 invalid_request and never reaches Stripe", async () => {
    for (const body of [
      { checkoutType: "pricing_v2", users: 0 },
      { checkoutType: "pricing_v2", users: 2.5 },
      { checkoutType: "pricing_v2", users: "3" },
      { checkoutType: "pricing_v2", users: 3, packCredits: 77 },
      { checkoutType: "pricing_v2_credits", credits: 0 },
      { checkoutType: "pricing_v2_credits", credits: 1.5 },
      { checkoutType: "pricing_v2_credits", credits: 1_000_000 },
    ]) {
      const res = await call(body);
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("invalid_request");
    }
    expect(h.createV2).not.toHaveBeenCalled();
  });

  it("missing prices -> 503 prices_not_configured listing env NAMES only", async () => {
    vi.stubEnv("STRIPE_PRICE_V2_PACK_120", "");
    const res = await call({ checkoutType: "pricing_v2", users: 3, packCredits: 120 });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("prices_not_configured");
    expect(body.missingPriceEnvKeys).toEqual(["STRIPE_PRICE_V2_PACK_120"]);
    expect(JSON.stringify(body)).not.toContain("price_1Abcdefgh");
    expect(h.createV2).not.toHaveBeenCalled();
  });

  it("placeholder price counts as missing", async () => {
    vi.stubEnv("STRIPE_PRICE_V2_CREDIT", "price_xxx");
    const res = await call({ checkoutType: "pricing_v2_credits", credits: 5 });
    expect(res.status).toBe(503);
  });

  it("legacy subscriber -> 409 legacy_subscription", async () => {
    h.createV2.mockResolvedValueOnce({ kind: "legacy_subscription" });
    const res = await call({ checkoutType: "pricing_v2", users: 3 });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("legacy_subscription");
  });

  it("existing v2 subscription -> 409 subscription_exists", async () => {
    h.createV2.mockResolvedValueOnce({ kind: "subscription_exists" });
    const res = await call({ checkoutType: "pricing_v2", users: 3 });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("subscription_exists");
  });

  it("Stripe unavailable or a session without url -> 503", async () => {
    h.createV2.mockResolvedValueOnce({ kind: "unavailable" });
    expect((await call({ checkoutType: "pricing_v2", users: 3 })).status).toBe(503);
    h.createV2.mockResolvedValueOnce({ kind: "ok", result: { id: "cs", url: null } });
    expect((await call({ checkoutType: "pricing_v2", users: 3 })).status).toBe(503);
  });
});
