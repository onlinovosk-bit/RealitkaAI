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
  STRIPE_PRICE_V2_START_YEARLY: "price_1Abcdefgh12361",
  STRIPE_PRICE_V2_TEAM_YEARLY: "price_1Abcdefgh12362",
  STRIPE_PRICE_V2_OFFICE_YEARLY: "price_1Abcdefgh12363",
  STRIPE_PRICE_V2_NETWORK_YEARLY: "price_1Abcdefgh12364",
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
    vi.stubEnv("PRICING_V2_PLANS_ONLY", "false");
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
    expect(h.createV2).toHaveBeenCalledWith({ checkoutType: "pricing_v2", users: 3, packCredits: 120, interval: "month" });
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

  it("výnimka pri tvorbe v2 checkoutu (napr. profil bez agentúry) -> 503 checkout_failed bez vnútornej správy", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    h.createV2.mockRejectedValueOnce(new Error("Chýba agency_id profilu — interný detail"));
    const res = await call({ checkoutType: "pricing_v2", users: 3 });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("checkout_failed");
    expect(JSON.stringify(body)).not.toContain("agency_id");
  });

  it("výnimka v legacy ceste ostáva ako dnes (400 s textom výnimky)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    h.createSeat.mockRejectedValueOnce(new Error("seat boom"));
    const res = await call({ checkoutType: "seat", seatTier: "solo", quantity: 1 });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/billing/credits/checkout — režim „len plány“ (predvolený pri zapnutom v2)", () => {
  beforeEach(() => {
    vi.stubEnv("PRICING_V2_ENABLED", "true");
    // PRICING_V2_PLANS_ONLY zámerne nenastavené: predvolené správanie musí predaj balíkov blokovať.
    for (const [k, v] of Object.entries(V2_ENV)) vi.stubEnv(k, v);
  });

  it("plan bez balíka prejde", async () => {
    const res = await call({ checkoutType: "pricing_v2", users: 3 });
    expect(res.status).toBe(200);
    expect(h.createV2).toHaveBeenCalledWith({ checkoutType: "pricing_v2", users: 3, packCredits: null, interval: "month" });
  });

  it.each([60, 120, 180, 240, 300])("plan s balíkom %i je 403 credits_not_sold a nedôjde k Stripe", async (pack) => {
    const res = await call({ checkoutType: "pricing_v2", users: 3, packCredits: pack });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("credits_not_sold");
    expect(h.createV2).not.toHaveBeenCalled();
  });

  it("jednorazový kredit je 403 credits_not_sold a nedôjde k Stripe", async () => {
    const res = await call({ checkoutType: "pricing_v2_credits", credits: 25 });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("credits_not_sold");
    expect(h.createV2).not.toHaveBeenCalled();
  });

  it("blokuje aj keď sú ceny balíkov a kreditu v env platné (nestačí „chýba cena“)", async () => {
    const res = await call({ checkoutType: "pricing_v2", users: 3, packCredits: 60 });
    expect(res.status).toBe(403);
  });

  it.each(["false", "0", "off", " OFF "])("PRICING_V2_PLANS_ONLY=%j výslovne zapne predaj balíkov", async (value) => {
    vi.stubEnv("PRICING_V2_PLANS_ONLY", value);
    const res = await call({ checkoutType: "pricing_v2", users: 3, packCredits: 60 });
    expect(res.status).toBe(200);
  });

  it.each(["", "true", "1", "yes", "nonsense"])("PRICING_V2_PLANS_ONLY=%j ostáva v bezpečnom režime", async (value) => {
    vi.stubEnv("PRICING_V2_PLANS_ONLY", value);
    const res = await call({ checkoutType: "pricing_v2_credits", credits: 5 });
    expect(res.status).toBe(403);
  });

  it("plan bez cien balíkov v env: nie je 503, chýbajúce ceny balíkov nič neblokujú", async () => {
    for (const k of Object.keys(V2_ENV).filter((n) => n.includes("PACK") || n.endsWith("CREDIT"))) vi.stubEnv(k, "");
    const res = await call({ checkoutType: "pricing_v2", users: 3 });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/billing/credits/checkout — ročné platenie", () => {
  beforeEach(() => {
    vi.stubEnv("PRICING_V2_ENABLED", "true");
    for (const [k, v] of Object.entries(V2_ENV)) vi.stubEnv(k, v);
  });

  it("ročný plán prejde a požiadavka nesie interval year", async () => {
    const res = await call({ checkoutType: "pricing_v2", users: 3, interval: "year" });
    expect(res.status).toBe(200);
    expect(h.createV2).toHaveBeenCalledWith({ checkoutType: "pricing_v2", users: 3, packCredits: null, interval: "year" });
  });

  it("neznámy interval je 400 invalid_request a nedôjde k Stripe", async () => {
    const res = await call({ checkoutType: "pricing_v2", users: 3, interval: "weekly" });
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe("invalid_interval");
    expect(h.createV2).not.toHaveBeenCalled();
  });

  it("ročný plán s balíkom je zamietnutý (400) aj keď sú ceny balíkov nastavené a režim len plány je vypnutý", async () => {
    vi.stubEnv("PRICING_V2_PLANS_ONLY", "false");
    const res = await call({ checkoutType: "pricing_v2", users: 3, interval: "year", packCredits: 60 });
    expect(res.status).toBe(400);
    expect(h.createV2).not.toHaveBeenCalled();
  });

  it("chýbajúca ročná cena = 503 prices_not_configured s názvom premennej; mesačný nákup funguje", async () => {
    vi.stubEnv("STRIPE_PRICE_V2_TEAM_YEARLY", "");
    const bad = await call({ checkoutType: "pricing_v2", users: 3, interval: "year" });
    expect(bad.status).toBe(503);
    const body = await bad.json();
    expect(body.code).toBe("prices_not_configured");
    expect(body.missingPriceEnvKeys).toEqual(["STRIPE_PRICE_V2_TEAM_YEARLY"]);
    expect(h.createV2).not.toHaveBeenCalled();
    const ok = await call({ checkoutType: "pricing_v2", users: 3 });
    expect(ok.status).toBe(200);
  });
});
