import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Fakes: Stripe, auth, Supabase (in-memory agencies/profiles), kreditové RPC (in-memory ledger)
// ---------------------------------------------------------------------------

type Row = Record<string, unknown> & { id: string };

const h = vi.hoisted(() => ({
  sessionsCreate: vi.fn(),
  getCurrentUser: vi.fn(),
  getCurrentProfile: vi.fn(),
  /** Skutočný stav predplatného, ktorý vráti Stripe pri plnení checkoutu (predvolene živé). */
  subRetrieve: vi.fn(async (id: string) => ({ id, status: "active", customer: "cus_test" })),
}));

vi.mock("stripe", () => ({
  default: vi.fn(function StripePlaceholder(this: Record<string, unknown>) {
    this.checkout = { sessions: { create: h.sessionsCreate } };
    this.subscriptions = { retrieve: (id: string) => h.subRetrieve(id) };
    return undefined;
  }),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: (...a: unknown[]) => h.getCurrentUser(...a),
  getCurrentProfile: (...a: unknown[]) => h.getCurrentProfile(...a),
}));

const db = {
  agencies: [] as Row[],
  profileUpdates: [] as Array<{ payload: Record<string, unknown>; col: string; val: unknown }>,
  agencyUpdates: [] as Array<{ payload: Record<string, unknown>; col: string; val: unknown }>,
  readError: null as { message: string } | null,
  updateError: null as { message: string } | null,
  /** UPDATE nezasiahne žiadny riadok (agentúra zmizla medzi čítaním a zápisom), bez chyby. */
  updateMatchesNothing: false,
};

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      if (table === "agencies") {
        return {
          select: (cols?: string) => ({
            eq: (col: string, val: unknown) => {
              const row = db.readError ? null : (db.agencies.find((a) => a[col] === val) ?? null);
              const read = async () => ({ data: row, error: db.readError });
              // seat grant path uses .single(); v2 plan path uses .maybeSingle().
              return { maybeSingle: read, single: read, _cols: cols };
            },
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: (col: string, val: unknown) => {
              db.agencyUpdates.push({ payload, col, val });
              const rows = db.updateMatchesNothing ? [] : db.agencies.filter((a) => a[col] === val);
              if (!db.updateError) rows.forEach((r) => Object.assign(r, payload));
              const res = {
                data: db.updateError ? null : rows.map((r) => ({ id: r.id })),
                error: db.updateError,
              };
              return Object.assign(Promise.resolve(res), { select: () => Promise.resolve(res) });
            },
          }),
        };
      }
      if (table === "profiles") {
        return {
          update: (payload: Record<string, unknown>) => ({
            eq: (col: string, val: unknown) => {
              db.profileUpdates.push({ payload, col, val });
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      return {};
    },
  }),
}));

/** Atomický ledger: kľúč → suma. Rovnaká sémantika ako RPC (skip, ak kľúč existuje). */
const ledger = new Map<string, number>();
const rpc = {
  grantCalls: [] as Array<{ agencyId: string; amount: number; periodKey: string; idempotencyKey: string }>,
  purchaseCalls: [] as Array<{ agencyId: string; amount: number; reason: string; idempotencyKey: string }>,
  failGrant: false,
  failPurchase: false,
};

vi.mock("@/lib/credits/mutate-credits", () => ({
  applyMonthlyGrantCredits: async (input: {
    agencyId: string;
    amount: number;
    periodKey: string;
    idempotencyKey: string;
  }) => {
    rpc.grantCalls.push(input);
    await Promise.resolve();
    if (rpc.failGrant) return { ok: false, error: "rpc_down" };
    if (ledger.has(input.idempotencyKey)) return { ok: true, skipped: true };
    ledger.set(input.idempotencyKey, input.amount);
    return { ok: true, granted: input.amount };
  },
  applyCreditPurchase: async (input: {
    agencyId: string;
    amount: number;
    reason: string;
    idempotencyKey: string;
  }) => {
    rpc.purchaseCalls.push(input);
    await Promise.resolve();
    if (rpc.failPurchase) return { ok: false, error: "rpc_down" };
    if (ledger.has(input.idempotencyKey)) return { ok: true, skipped: true, credited: 0 };
    ledger.set(input.idempotencyKey, input.amount);
    return { ok: true, credited: input.amount };
  },
  expireGrantCreditsAtomic: vi.fn(),
}));

import {
  applyPricingV2SubscriptionEvent,
  buildPricingV2CreditsCheckoutParams,
  buildPricingV2PlanCheckoutParams,
  clampLicensedUsers,
  createPricingV2CheckoutSession,
  fulfillPricingV2CreditsCheckout,
  fulfillPricingV2PlanCheckout,
  hasLegacySubscription,
  hasLivePricingV2Subscription,
  missingPricingV2PriceEnvKeysForRequest,
  parsePricingV3CheckoutBody,
  readPricingV2SubscriptionItems,
  resolvePricingV2PriceRole,
  subscriptionHasPricingV2Price,
} from "@/lib/credits-billing-v2";
import { handlePricingCheckoutWebhook } from "@/lib/credits-billing-webhook";
import { currentPeriodKey, monthlyGrantAmountForAgency } from "@/lib/credits/grant-engine";
import { PRICING_V3_SEAT_PRICE_ENV } from "@/lib/pricing-v2-contract";

// Syntetické price ID (nie sú to skutočné Stripe ID).
const PRICE = {
  STRIPE_PRICE_V3_START_MONTHLY: "price_1Abcdefgh12341",
  STRIPE_PRICE_V3_START_YEARLY: "price_1Abcdefgh12342",
  STRIPE_PRICE_V3_TEAM_MONTHLY: "price_1Abcdefgh12343",
  STRIPE_PRICE_V3_TEAM_YEARLY: "price_1Abcdefgh12344",
  STRIPE_PRICE_V3_KANCELARIA_MONTHLY: "price_1Abcdefgh12345",
  STRIPE_PRICE_V3_KANCELARIA_YEARLY: "price_1Abcdefgh12346",
  STRIPE_PRICE_V3_SIET_MONTHLY: "price_1Abcdefgh12347",
  STRIPE_PRICE_V3_SIET_YEARLY: "price_1Abcdefgh12348",
  STRIPE_PRICE_V3_SEAT_MONTHLY: "price_1Abcdefgh12998",
  STRIPE_PRICE_V3_SEAT_YEARLY: "price_1Abcdefgh12999",
  STRIPE_PRICE_V3_PACK_50: "price_1Abcdefgh12445",
  STRIPE_PRICE_V3_PACK_100: "price_1Abcdefgh12446",
  STRIPE_PRICE_V3_PACK_150: "price_1Abcdefgh12447",
  STRIPE_PRICE_V3_PACK_200: "price_1Abcdefgh12448",
  STRIPE_PRICE_V3_PACK_250: "price_1Abcdefgh12449",
  STRIPE_PRICE_V3_PACK_300: "price_1Abcdefgh12451",
  STRIPE_PRICE_V3_CREDIT: "price_1Abcdefgh12450",
} as const;
function stubAllPrices() {
  for (const [k, v] of Object.entries(PRICE)) vi.stubEnv(k, v);
}

/** Čas tesne pred koncom akcie 9/12 a hneď po ňom. */
const BEFORE_PROMO_END = new Date("2026-12-31T22:59:59Z");
const AFTER_PROMO_END = new Date("2026-12-31T23:00:00Z");

const AGENCY = "11111111-1111-4111-8111-111111111111";

function planSession(over: Record<string, unknown> = {}, metaOver: Record<string, string> = {}) {
  return {
    id: "cs_plan_1",
    payment_status: "paid",
    customer: "cus_1",
    subscription: "sub_1",
    metadata: {
      checkoutType: "pricing_v2",
      agencyId: AGENCY,
      authUserId: "user-1",
      profileId: "profile-1",
      bandId: "team",
      users: "3",
      packCredits: "100",
      ...metaOver,
    },
    ...over,
  } as never;
}

function creditsSession(over: Record<string, unknown> = {}, metaOver: Record<string, string> = {}) {
  return {
    id: "cs_credits_1",
    payment_status: "paid",
    metadata: { checkoutType: "pricing_v2_credits", agencyId: AGENCY, authUserId: "u", profileId: "p", credits: "40", ...metaOver },
    ...over,
  } as never;
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_synthetic");
  h.subRetrieve.mockImplementation(async (id: string) => ({ id, status: "active", customer: "cus_test" }));
  db.agencies = [];
  db.profileUpdates = [];
  db.agencyUpdates = [];
  db.readError = null;
  db.updateError = null;
  db.updateMatchesNothing = false;
  ledger.clear();
  rpc.grantCalls = [];
  rpc.purchaseCalls = [];
  rpc.failGrant = false;
  rpc.failPurchase = false;
});

// ---------------------------------------------------------------------------
describe("v3 checkout builders", () => {
  const actor = { agencyId: AGENCY, authUserId: "user-1", profileId: "profile-1" };

  it("plan: jedna licenčná cena, quantity = počet maklérov, metadata zo zmluvy", () => {
    stubAllPrices();
    const p = buildPricingV2PlanCheckoutParams({ ...actor, users: 1, packCredits: null });
    expect(p.mode).toBe("subscription");
    expect(p.lineItems).toEqual([{ price: PRICE.STRIPE_PRICE_V3_START_MONTHLY, quantity: 1 }]);
    expect(p.metadata).toMatchObject({ checkoutType: "pricing_v2", agencyId: AGENCY, bandId: "start", users: "1", packCredits: "0" });
  });

  it("plan: cena sa vyberie podľa pásma, quantity = n, pásmo v metadátach vyplýva z n (1, 2, 5, 6, 10, 11, 60)", () => {
    stubAllPrices();
    const bandAt = (users: number, price: string) => {
      const p = buildPricingV2PlanCheckoutParams({ ...actor, users, packCredits: null });
      expect(p.lineItems).toEqual([{ price, quantity: users }]);
      return p.metadata.bandId;
    };
    expect([
      bandAt(1, PRICE.STRIPE_PRICE_V3_START_MONTHLY),
      bandAt(2, PRICE.STRIPE_PRICE_V3_TEAM_MONTHLY),
      bandAt(5, PRICE.STRIPE_PRICE_V3_TEAM_MONTHLY),
      bandAt(6, PRICE.STRIPE_PRICE_V3_KANCELARIA_MONTHLY),
      bandAt(10, PRICE.STRIPE_PRICE_V3_KANCELARIA_MONTHLY),
      bandAt(11, PRICE.STRIPE_PRICE_V3_SIET_MONTHLY),
      bandAt(60, PRICE.STRIPE_PRICE_V3_SIET_MONTHLY),
    ]).toEqual(["start", "team", "team", "office", "office", "network", "network"]);
  });

  it("plan: voliteľný balík pridá druhý opakovaný riadok s qty 1 (quantity licencie ostáva n)", () => {
    stubAllPrices();
    const p = buildPricingV2PlanCheckoutParams({ ...actor, users: 3, packCredits: 100 });
    expect(p.lineItems).toEqual([
      { price: PRICE.STRIPE_PRICE_V3_TEAM_MONTHLY, quantity: 3 },
      { price: PRICE.STRIPE_PRICE_V3_PACK_100, quantity: 1 },
    ]);
    expect(p.metadata.packCredits).toBe("100");
    expect(p.discounts).toBeUndefined();
  });

  it("plan: fail-closed pri chýbajúcej, placeholder alebo chybnej cene (nikdy nejde do Stripe)", () => {
    expect(() => buildPricingV2PlanCheckoutParams({ ...actor, users: 1, packCredits: null })).toThrow(/nie je nakonfigurovan/);
    vi.stubEnv("STRIPE_PRICE_V3_START_MONTHLY", "price_xxx");
    expect(() => buildPricingV2PlanCheckoutParams({ ...actor, users: 1, packCredits: null })).toThrow();
    vi.stubEnv("STRIPE_PRICE_V3_START_MONTHLY", PRICE.STRIPE_PRICE_V3_START_MONTHLY);
    expect(() => buildPricingV2PlanCheckoutParams({ ...actor, users: 1, packCredits: 50 })).toThrow(/bal/);
    expect(() => buildPricingV2PlanCheckoutParams({ ...actor, users: 0, packCredits: null })).toThrow(RangeError);
    expect(() => buildPricingV2PlanCheckoutParams({ ...actor, agencyId: " ", users: 1, packCredits: null })).toThrow(RangeError);
  });

  it("ročný plán: ročná cena licencie, quantity = n, metadata interval=year, bez balíka", () => {
    stubAllPrices();
    for (const users of [1, 6, 25, 60]) {
      const p = buildPricingV2PlanCheckoutParams({ ...actor, users, packCredits: null, interval: "year" }, process.env, BEFORE_PROMO_END);
      const price =
        users === 1 ? PRICE.STRIPE_PRICE_V3_START_YEARLY :
        users <= 10 ? PRICE.STRIPE_PRICE_V3_KANCELARIA_YEARLY :
        PRICE.STRIPE_PRICE_V3_SIET_YEARLY;
      expect(p.lineItems).toEqual([{ price, quantity: users }]);
      expect(p.metadata.interval).toBe("year");
    }
    // bez zadaného intervalu ostáva mesačná cena
    expect(buildPricingV2PlanCheckoutParams({ ...actor, users: 3, packCredits: null }).lineItems[0].price).toBe(
      PRICE.STRIPE_PRICE_V3_TEAM_MONTHLY,
    );
  });

  it("ročný checkout nepridáva kupón ani pole zľavy", () => {
    stubAllPrices();
    const year = (now: Date) =>
      buildPricingV2PlanCheckoutParams({ ...actor, users: 3, packCredits: null, interval: "year" }, process.env, now);
    expect(year(BEFORE_PROMO_END).discounts).toBeUndefined();
    expect(year(new Date("2026-10-19T08:00:00Z")).discounts).toBeUndefined();
    expect(year(AFTER_PROMO_END).discounts).toBeUndefined();
    expect(year(new Date("2027-03-01T00:00:00Z")).discounts).toBeUndefined();
    expect(Object.keys(year(BEFORE_PROMO_END)).sort()).toEqual(["automaticTax", "lineItems", "metadata", "mode"]);
  });

  it("ročný plán s balíkom kreditov sa nikdy nezostaví; chýbajúca ročná cena = výnimka (mesačná cena sa nepodstrčí)", () => {
    stubAllPrices();
    expect(() => buildPricingV2PlanCheckoutParams({ ...actor, users: 3, packCredits: 50, interval: "year" })).toThrow(RangeError);
    vi.stubEnv("STRIPE_PRICE_V3_TEAM_YEARLY", "price_xxx");
    expect(() => buildPricingV2PlanCheckoutParams({ ...actor, users: 3, packCredits: null, interval: "year" })).toThrow(
      /nie je nakonfigurovan/,
    );
  });

  it("automatic_tax only when PRICING_V2_STRIPE_TAX is 'on'", () => {
    stubAllPrices();
    const input = { ...actor, users: 1, packCredits: null };
    expect(buildPricingV2PlanCheckoutParams(input).automaticTax).toBe(false);
    vi.stubEnv("PRICING_V2_STRIPE_TAX", "off");
    expect(buildPricingV2PlanCheckoutParams(input).automaticTax).toBe(false);
    vi.stubEnv("PRICING_V2_STRIPE_TAX", "on");
    expect(buildPricingV2PlanCheckoutParams(input).automaticTax).toBe(true);
    expect(buildPricingV2CreditsCheckoutParams({ ...actor, credits: 5 }).automaticTax).toBe(true);
  });

  it("credits: payment mode, STRIPE_PRICE_V3_CREDIT, quantity = credits", () => {
    stubAllPrices();
    const p = buildPricingV2CreditsCheckoutParams({ ...actor, credits: 37 });
    expect(p.mode).toBe("payment");
    expect(p.lineItems).toEqual([{ price: PRICE.STRIPE_PRICE_V3_CREDIT, quantity: 37 }]);
    expect(p.metadata).toMatchObject({ checkoutType: "pricing_v2_credits", agencyId: AGENCY, credits: "37" });
  });

  it("credits: rejects 0, fractions, negatives, over Stripe's 999 999 limit, missing price", () => {
    stubAllPrices();
    for (const credits of [0, 1.5, -3, 1_000_000, Number.NaN]) {
      expect(() => buildPricingV2CreditsCheckoutParams({ ...actor, credits })).toThrow(RangeError);
    }
    vi.stubEnv("STRIPE_PRICE_V3_CREDIT", "");
    expect(() => buildPricingV2CreditsCheckoutParams({ ...actor, credits: 5 })).toThrow(/nie je nakonfigurovan/);
  });

  it("missing-price report names only the env variables the request needs, never values", () => {
    vi.stubEnv("STRIPE_PRICE_V3_TEAM_MONTHLY", PRICE.STRIPE_PRICE_V3_TEAM_MONTHLY);
    const need = (r: Parameters<typeof missingPricingV2PriceEnvKeysForRequest>[0], now = BEFORE_PROMO_END) =>
      missingPricingV2PriceEnvKeysForRequest(r, process.env, now);
    expect(need({ checkoutType: "pricing_v2", users: 3, packCredits: null })).toEqual([]);
    expect(need({ checkoutType: "pricing_v2", users: 3, packCredits: 100 })).toEqual(["STRIPE_PRICE_V3_PACK_100"]);
    expect(need({ checkoutType: "pricing_v2", users: 1, packCredits: null, interval: "year" })).toEqual([
      "STRIPE_PRICE_V3_START_YEARLY",
    ]);
    expect(need({ checkoutType: "pricing_v2_credits", credits: 5 })).toEqual(["STRIPE_PRICE_V3_CREDIT"]);
  });

  it("fallback: stará intervalová cena stačí, ale neplatná nová env má prednosť a fail-closed", () => {
    vi.stubEnv("STRIPE_PRICE_V3_SEAT_YEARLY", PRICE.STRIPE_PRICE_V3_SEAT_YEARLY);
    const year = { checkoutType: "pricing_v2", users: 3, packCredits: null, interval: "year" } as const;
    expect(missingPricingV2PriceEnvKeysForRequest(year, process.env, BEFORE_PROMO_END)).toEqual([]);
    vi.stubEnv("STRIPE_PRICE_V3_TEAM_YEARLY", "price_xxx");
    expect(missingPricingV2PriceEnvKeysForRequest(year, process.env, BEFORE_PROMO_END)).toEqual(["STRIPE_PRICE_V3_TEAM_YEARLY"]);
  });

  it("telo požiadavky: seats (1..500) + interval; starší názov users sa ešte prijíma; mimo rozsahu sa odmietne", () => {
    const plan = (over: Record<string, unknown>) => parsePricingV3CheckoutBody({ checkoutType: "pricing_v2", ...over });
    expect(plan({ seats: 7, interval: "year" })).toEqual({
      ok: true,
      value: { checkoutType: "pricing_v2", users: 7, packCredits: null, interval: "year" },
    });
    expect(plan({ seats: 500, interval: "month" }).ok).toBe(true);
    expect(plan({ users: 3 }).ok).toBe(true);
    for (const seats of [0, -1, 1.5, 501, "3", null, Number.NaN]) {
      expect(plan({ seats, interval: "month" })).toEqual({ ok: false, reason: "invalid_user_count" });
    }
    expect(plan({ seats: 3, interval: "week" })).toEqual({ ok: false, reason: "invalid_interval" });
    expect(plan({ seats: 3, interval: "year", packCredits: 50 })).toEqual({ ok: false, reason: "invalid_pack" });
    expect(plan({ seats: 3, packCredits: 60 })).toEqual({ ok: false, reason: "invalid_pack" });
    expect(plan({ seats: 3, packCredits: 150 }).ok).toBe(true);
    expect(parsePricingV3CheckoutBody({ checkoutType: "pricing_v2_credits", credits: 5 }).ok).toBe(true);
    expect(parsePricingV3CheckoutBody({ type: "seat" })).toEqual({ ok: false, reason: "not_pricing_v2" });
  });
});

// ---------------------------------------------------------------------------
describe("v3 price recognition", () => {
  it("maps each configured price id to its role", () => {
    stubAllPrices();
    expect(resolvePricingV2PriceRole(PRICE.STRIPE_PRICE_V3_TEAM_MONTHLY)).toEqual({ kind: "seat", interval: "month" });
    expect(resolvePricingV2PriceRole(PRICE.STRIPE_PRICE_V3_SIET_YEARLY)).toEqual({ kind: "seat", interval: "year" });
    expect(resolvePricingV2PriceRole(PRICE.STRIPE_PRICE_V3_SEAT_MONTHLY)).toEqual({ kind: "seat", interval: "month" });
    expect(resolvePricingV2PriceRole(PRICE.STRIPE_PRICE_V3_PACK_250)).toEqual({ kind: "pack", credits: 250 });
    expect(resolvePricingV2PriceRole(PRICE.STRIPE_PRICE_V3_CREDIT)).toEqual({ kind: "credit" });
    expect(resolvePricingV2PriceRole("price_1Unrelated00000")).toBeNull();
  });

  it("staré v2 env premenné sa už nerozpoznávajú (V2 nikdy nebol live)", () => {
    vi.stubEnv("STRIPE_PRICE_V2_TEAM", "price_1OldV2Team00001");
    vi.stubEnv("STRIPE_PRICE_V2_PACK_60", "price_1OldV2Pack0001");
    expect(resolvePricingV2PriceRole("price_1OldV2Team00001")).toBeNull();
    expect(resolvePricingV2PriceRole("price_1OldV2Pack0001")).toBeNull();
  });

  it("ročná licencia je tá istá licencia s intervalom year; chýbajúca ročná cena hlási len svoj názov", () => {
    stubAllPrices();
    expect(PRICING_V3_SEAT_PRICE_ENV).toEqual({
      month: "STRIPE_PRICE_V3_SEAT_MONTHLY",
      year: "STRIPE_PRICE_V3_SEAT_YEARLY",
    });
    const year = { checkoutType: "pricing_v2", users: 3, packCredits: null, interval: "year" } as const;
    expect(missingPricingV2PriceEnvKeysForRequest(year, process.env, BEFORE_PROMO_END)).toEqual([]);
    vi.stubEnv("STRIPE_PRICE_V3_TEAM_YEARLY", "");
    vi.stubEnv("STRIPE_PRICE_V3_SEAT_YEARLY", "");
    expect(missingPricingV2PriceEnvKeysForRequest(year, process.env, BEFORE_PROMO_END)).toEqual(["STRIPE_PRICE_V3_TEAM_YEARLY"]);
    // mesačná požiadavka tým nie je dotknutá
    expect(missingPricingV2PriceEnvKeysForRequest({ checkoutType: "pricing_v2", users: 3, packCredits: null })).toEqual([]);
  });

  it("unset env never matches an undefined / blank / placeholder id (undefined === undefined trap)", () => {
    expect(resolvePricingV2PriceRole(undefined)).toBeNull();
    expect(resolvePricingV2PriceRole("")).toBeNull();
    vi.stubEnv("STRIPE_PRICE_V3_TEAM_MONTHLY", "price_xxx");
    expect(resolvePricingV2PriceRole("price_xxx")).toBeNull();
  });

  it("subscription is v2 when ANY item is a v2 price, regardless of item order", () => {
    stubAllPrices();
    const sub = (...ids: string[]) => ({ items: { data: ids.map((id) => ({ price: { id } })) } });
    expect(subscriptionHasPricingV2Price(sub(PRICE.STRIPE_PRICE_V3_PACK_50, PRICE.STRIPE_PRICE_V3_TEAM_MONTHLY))).toBe(true);
    expect(subscriptionHasPricingV2Price(sub("price_1Legacy000000"))).toBe(false);
    expect(subscriptionHasPricingV2Price(sub())).toBe(false);
    expect(subscriptionHasPricingV2Price(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe("legacy subscription detection (kritérium 8)", () => {
  it("v2 agency is not legacy; plain agency without subscription is not legacy", () => {
    expect(hasLegacySubscription({ pricing_model: "v2", subscription_status: "active", stripe_subscription_id: "sub_x" })).toBe(false);
    expect(hasLegacySubscription({ pricing_model: null, subscription_status: null, stripe_subscription_id: null })).toBe(false);
    expect(hasLegacySubscription({})).toBe(false);
  });

  it("any live legacy subscription state blocks, and so does an unreadable row (fail-closed)", () => {
    for (const status of ["active", "trialing", "past_due", "unpaid", "incomplete"]) {
      expect(hasLegacySubscription({ pricing_model: null, subscription_status: status })).toBe(true);
    }
    expect(hasLegacySubscription({ pricing_model: null, subscription_status: null, stripe_subscription_id: "sub_old" })).toBe(true);
    expect(hasLegacySubscription(null)).toBe(true);
    expect(hasLegacySubscription({ pricing_model: "v3" })).toBe(true);
  });

  it("a manually agreed plan (no Stripe subscription) is legacy and never migrated", () => {
    expect(hasLegacySubscription({ pricing_model: null, subscription_status: null, manual_plan: "market_vision" })).toBe(true);
    expect(hasLegacySubscription({ pricing_model: null, manual_plan: "  " })).toBe(false);
  });

  it("a cancelled legacy subscription does not block a fresh, explicit v2 purchase", () => {
    expect(hasLegacySubscription({ pricing_model: null, subscription_status: "canceled", stripe_subscription_id: "sub_old" })).toBe(false);
  });

  it("live v2 subscription is detected separately", () => {
    expect(hasLivePricingV2Subscription({ pricing_model: "v2", subscription_status: "active" })).toBe(true);
    expect(hasLivePricingV2Subscription({ pricing_model: "v2", subscription_status: "canceled", stripe_subscription_id: "s" })).toBe(false);
    expect(hasLivePricingV2Subscription({ pricing_model: null, subscription_status: "active" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe("createPricingV2CheckoutSession", () => {
  beforeEach(() => {
    stubAllPrices();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_synthetic");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.test");
    h.getCurrentUser.mockResolvedValue({ id: "user-1", email: "broker@example.test" });
    h.getCurrentProfile.mockResolvedValue({ id: "profile-1", agency_id: AGENCY });
    h.sessionsCreate.mockResolvedValue({ id: "cs_new", url: "https://checkout.example.test/s" });
    db.agencies = [{ id: AGENCY, pricing_model: null, subscription_status: null, stripe_subscription_id: null }];
  });

  const planReq = { checkoutType: "pricing_v2", users: 3, packCredits: 100 } as const;

  it("creates a subscription session with seat (quantity n) + pack lines and v3 metadata", async () => {
    const out = await createPricingV2CheckoutSession(planReq);
    expect(out).toEqual({ kind: "ok", result: { id: "cs_new", url: "https://checkout.example.test/s" } });
    const arg = h.sessionsCreate.mock.calls[0][0];
    expect(arg.mode).toBe("subscription");
    expect(arg.line_items).toEqual([
      { price: PRICE.STRIPE_PRICE_V3_TEAM_MONTHLY, quantity: 3 },
      { price: PRICE.STRIPE_PRICE_V3_PACK_100, quantity: 1 },
    ]);
    expect(arg.discounts).toBeUndefined();
    expect(arg.allow_promotion_codes).toBeUndefined();
    expect(arg.metadata).toMatchObject({ checkoutType: "pricing_v2", agencyId: AGENCY, authUserId: "user-1", profileId: "profile-1", bandId: "team", users: "3", packCredits: "100" });
    expect(arg.subscription_data.metadata).toEqual({ checkoutType: "pricing_v2", agencyId: AGENCY });
    expect(arg.automatic_tax).toBeUndefined();
  });

  it("ročný plán: Stripe session používa plánovú ročnú cenu bez zľavového poľa", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(BEFORE_PROMO_END);
      await createPricingV2CheckoutSession({ checkoutType: "pricing_v2", users: 8, packCredits: null, interval: "year" });
      const early = h.sessionsCreate.mock.calls[0][0];
      expect(early.line_items).toEqual([{ price: PRICE.STRIPE_PRICE_V3_KANCELARIA_YEARLY, quantity: 8 }]);
      expect(early.discounts).toBeUndefined();
      expect(early.allow_promotion_codes).toBeUndefined();

      vi.setSystemTime(AFTER_PROMO_END);
      await createPricingV2CheckoutSession({ checkoutType: "pricing_v2", users: 8, packCredits: null, interval: "year" });
      const late = h.sessionsCreate.mock.calls[1][0];
      expect(late.discounts).toBeUndefined();
      expect(late.line_items).toEqual([{ price: PRICE.STRIPE_PRICE_V3_KANCELARIA_YEARLY, quantity: 8 }]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("creates a one-time payment session for credits", async () => {
    const out = await createPricingV2CheckoutSession({ checkoutType: "pricing_v2_credits", credits: 25 });
    expect(out.kind).toBe("ok");
    const arg = h.sessionsCreate.mock.calls[0][0];
    expect(arg.mode).toBe("payment");
    expect(arg.line_items).toEqual([{ price: PRICE.STRIPE_PRICE_V3_CREDIT, quantity: 25 }]);
    expect(arg.metadata.checkoutType).toBe("pricing_v2_credits");
  });

  it("legacy subscriber gets legacy_subscription and Stripe is never called (plan AND credits)", async () => {
    db.agencies = [{ id: AGENCY, pricing_model: null, subscription_status: "active", stripe_subscription_id: "sub_legacy" }];
    expect(await createPricingV2CheckoutSession(planReq)).toEqual({ kind: "legacy_subscription" });
    expect(await createPricingV2CheckoutSession({ checkoutType: "pricing_v2_credits", credits: 5 })).toEqual({ kind: "legacy_subscription" });
    expect(h.sessionsCreate).not.toHaveBeenCalled();
    // ...a nič sa nepresunulo:
    expect(db.agencyUpdates).toHaveLength(0);
  });

  it("existing live v2 subscription cannot start a second plan subscription, but can buy credits", async () => {
    db.agencies = [{ id: AGENCY, pricing_model: "v2", subscription_status: "active", stripe_subscription_id: "sub_v2" }];
    expect(await createPricingV2CheckoutSession(planReq)).toEqual({ kind: "subscription_exists" });
    expect(h.sessionsCreate).not.toHaveBeenCalled();
    expect((await createPricingV2CheckoutSession({ checkoutType: "pricing_v2_credits", credits: 5 })).kind).toBe("ok");
  });

  it("unreadable agency state fails instead of guessing (no checkout)", async () => {
    db.readError = { message: "db down" };
    await expect(createPricingV2CheckoutSession(planReq)).rejects.toThrow();
    expect(h.sessionsCreate).not.toHaveBeenCalled();
  });

  it("missing agency row is treated as legacy (fail-closed)", async () => {
    db.agencies = [];
    expect(await createPricingV2CheckoutSession(planReq)).toEqual({ kind: "legacy_subscription" });
  });

  it("without Stripe key the checkout is unavailable", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(await createPricingV2CheckoutSession(planReq)).toEqual({ kind: "unavailable" });
  });

  it("profile without agency_id throws before any Stripe call", async () => {
    h.getCurrentProfile.mockResolvedValue({ id: "profile-1", agency_id: "" });
    await expect(createPricingV2CheckoutSession(planReq)).rejects.toThrow(/agency_id/);
    expect(h.sessionsCreate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe("fulfillPricingV2PlanCheckout (kritériá 2, 3)", () => {
  beforeEach(() => {
    db.agencies = [{ id: AGENCY, pricing_model: null, subscription_status: null, stripe_subscription_id: null, seats: 0 }];
  });

  it("writes band, users, pack, tier mapping and the first grant (band + pack credits)", async () => {
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(true);
    expect(db.agencies[0]).toMatchObject({
      pricing_model: "v2",
      pricing_band: "team",
      licensed_users: 3,
      seats: 3,
      pack_credits: 100,
      account_tier: "pro",
      subscription_status: "active",
      stripe_subscription_id: "sub_1",
      stripe_customer_id: "cus_1",
    });
    expect(rpc.grantCalls).toHaveLength(1);
    // team 60 + balík 100 — nie seaty × sadzba (3 × 25 = 75).
    expect(rpc.grantCalls[0]).toMatchObject({ agencyId: AGENCY, amount: 160, periodKey: currentPeriodKey() });
    expect(rpc.grantCalls[0].idempotencyKey).toBe(`grant:${AGENCY}:${currentPeriodKey()}`);
    expect(db.profileUpdates[0]).toMatchObject({ col: "auth_user_id", val: "user-1", payload: { account_tier: "pro", ui_role: "agent" } });
  });

  it("network/office bands map to enterprise tier and owner_vision role", async () => {
    await fulfillPricingV2PlanCheckout(planSession({}, { bandId: "office", users: "10", packCredits: "0" }));
    expect(db.agencies[0]).toMatchObject({ account_tier: "enterprise", pricing_band: "office", pack_credits: 0 });
    expect(rpc.grantCalls[0].amount).toBe(120);
    expect(db.profileUpdates[0].payload).toMatchObject({ ui_role: "owner_vision" });
  });

  it("quantity zo Stripe je pravda: licensed_users = seats = quantity položky licencie, pásmo z nej (nie z metadát)", async () => {
    stubAllPrices();
    h.subRetrieve.mockImplementation(async (id: string) => ({
      id,
      status: "active",
      customer: "cus_test",
      items: {
        data: [
          { quantity: 1, price: { id: PRICE.STRIPE_PRICE_V3_PACK_100 } },
          { quantity: 12, price: { id: PRICE.STRIPE_PRICE_V3_SEAT_MONTHLY } },
        ],
      },
    }));
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(true);
    expect(db.agencies[0]).toMatchObject({
      licensed_users: 12,
      seats: 12,
      pricing_band: "network",
      account_tier: "enterprise",
      pricing_model: "v2",
    });
    // network 175 + balík 100
    expect(rpc.grantCalls[0].amount).toBe(275);
    expect(db.profileUpdates[0].payload).toMatchObject({ account_tier: "enterprise", ui_role: "owner_vision" });
  });

  it("bez čitateľnej licenčnej položky v odpovedi Stripe sa použije počet z metadát", async () => {
    stubAllPrices();
    h.subRetrieve.mockImplementation(async (id: string) => ({
      id,
      status: "active",
      customer: "cus_test",
      items: { data: [{ quantity: 1, price: { id: PRICE.STRIPE_PRICE_V3_PACK_100 } }] },
    }));
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(true);
    expect(db.agencies[0]).toMatchObject({ licensed_users: 3, seats: 3, pricing_band: "team" });
  });

  it("duplicate webhook: entitlements idempotent, second call reports success without a second grant", async () => {
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(true);
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(true);
    expect(rpc.grantCalls).toHaveLength(2);
    expect(new Set(rpc.grantCalls.map((c) => c.idempotencyKey)).size).toBe(1);
    expect([...ledger.entries()]).toEqual([[`grant:${AGENCY}:${currentPeriodKey()}`, 160]]);
  });

  it("concurrent webhooks produce exactly one ledger grant", async () => {
    const results = await Promise.all([
      fulfillPricingV2PlanCheckout(planSession()),
      fulfillPricingV2PlanCheckout(planSession()),
      fulfillPricingV2PlanCheckout(planSession()),
    ]);
    expect(results).toEqual([true, true, true]);
    expect(ledger.size).toBe(1);
    expect([...ledger.values()]).toEqual([160]);
  });

  it("shares the idempotency key with the monthly cron, so cron + webhook in one period cannot double-grant", async () => {
    const { monthlyGrantIdempotencyKey } = await import("@/lib/credits/grant-idempotency");
    ledger.set(monthlyGrantIdempotencyKey(AGENCY, currentPeriodKey()), 999);
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(true);
    expect([...ledger.values()]).toEqual([999]);
  });

  it("invalid metadata fails (never a silent true) and writes nothing", async () => {
    const badMetas: Array<Record<string, string>> = [
      { bandId: "office" }, // pásmo nesedí s počtom používateľov
      { users: "0" },
      { agencyId: "" },
      { packCredits: "77" },
      { checkoutType: "pricing_v2_x" },
    ];
    for (const meta of badMetas) {
      expect(await fulfillPricingV2PlanCheckout(planSession({}, meta))).toBe(false);
    }
    expect(await fulfillPricingV2PlanCheckout(planSession({ metadata: null }))).toBe(false);
    expect(db.agencyUpdates).toHaveLength(0);
    expect(rpc.grantCalls).toHaveLength(0);
  });

  it("missing subscription id fails (cannot link later subscription events)", async () => {
    expect(await fulfillPricingV2PlanCheckout(planSession({ subscription: null }))).toBe(false);
    expect(db.agencyUpdates).toHaveLength(0);
  });

  it("accepts an expanded subscription / customer object", async () => {
    expect(await fulfillPricingV2PlanCheckout(planSession({ subscription: { id: "sub_obj" }, customer: { id: "cus_obj" } }))).toBe(true);
    expect(db.agencies[0]).toMatchObject({ stripe_subscription_id: "sub_obj", stripe_customer_id: "cus_obj" });
  });

  it("unpaid (async payment pending) grants nothing yet and does not touch the agency", async () => {
    expect(await fulfillPricingV2PlanCheckout(planSession({ payment_status: "unpaid" }))).toBe(true);
    expect(db.agencyUpdates).toHaveLength(0);
    expect(rpc.grantCalls).toHaveLength(0);
  });

  it("stav berie zo Stripe: zrušené/unpaid/incomplete_expired predplatné sa neaktivuje, nič sa nezapíše ani nepridelí", async () => {
    for (const status of ["canceled", "unpaid", "incomplete_expired"]) {
      db.agencyUpdates = [];
      rpc.grantCalls.length = 0;
      h.subRetrieve.mockImplementation(async (id: string) => ({ id, status, customer: "cus_test" }));
      expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(true);
      expect(db.agencyUpdates).toHaveLength(0);
      expect(rpc.grantCalls).toHaveLength(0);
    }
  });

  it("zapíše stav predplatného zo Stripe (nie natvrdo 'active'); past_due nedostane prvý grant", async () => {
    h.subRetrieve.mockImplementation(async (id: string) => ({ id, status: "past_due", customer: "cus_test" }));
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(true);
    expect(db.agencyUpdates[0]?.payload.subscription_status).toBe("past_due");
    expect(rpc.grantCalls).toHaveLength(0);
  });

  it("Stripe nedostupný alebo chýba kľúč: fulfillment zlyhá (Stripe zopakuje), nič sa nezapíše", async () => {
    h.subRetrieve.mockImplementation(async () => {
      throw new Error("stripe down");
    });
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(false);
    expect(db.agencyUpdates).toHaveLength(0);
    expect(rpc.grantCalls).toHaveLength(0);

    vi.stubEnv("STRIPE_SECRET_KEY", "");
    h.subRetrieve.mockImplementation(async (id: string) => ({ id, status: "active", customer: "cus_test" }));
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(false);
    expect(db.agencyUpdates).toHaveLength(0);
  });

  it("agency that does not exist: update touches 0 rows -> fails, no grant", async () => {
    db.agencies = [];
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(false);
    expect(rpc.grantCalls).toHaveLength(0);
  });

  it("UPDATE that touches 0 rows (no error) is not success and grants nothing", async () => {
    db.updateMatchesNothing = true;
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(false);
    expect(rpc.grantCalls).toHaveLength(0);
  });

  it("DB update error fails the fulfillment (Stripe retries)", async () => {
    db.updateError = { message: "boom" };
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(false);
    expect(rpc.grantCalls).toHaveLength(0);
  });

  it("grant RPC failure fails the fulfillment, and the retry then grants exactly once", async () => {
    rpc.failGrant = true;
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(false);
    rpc.failGrant = false;
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(true);
    expect([...ledger.values()]).toEqual([160]);
  });

  it("manual_plan agency is not migrated by a webhook either", async () => {
    db.agencies = [{ id: AGENCY, pricing_model: null, subscription_status: null, manual_plan: "market_vision" }];
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(false);
    expect(db.agencyUpdates).toHaveLength(0);
  });

  it("legacy subscriber is never migrated by a webhook (kritérium 8)", async () => {
    db.agencies = [{ id: AGENCY, pricing_model: null, subscription_status: "active", stripe_subscription_id: "sub_legacy", seats: 4, account_tier: "pro" }];
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(false);
    expect(db.agencyUpdates).toHaveLength(0);
    expect(db.agencies[0].pricing_model).toBeNull();
    expect(rpc.grantCalls).toHaveLength(0);
  });

  it("unreadable agency fails", async () => {
    db.readError = { message: "db down" };
    expect(await fulfillPricingV2PlanCheckout(planSession())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe("fulfillPricingV2CreditsCheckout (kritériá 3, 7)", () => {
  it("credits the PURCHASED pool through the atomic RPC keyed on the session id", async () => {
    expect(await fulfillPricingV2CreditsCheckout(creditsSession())).toBe(true);
    expect(rpc.purchaseCalls).toEqual([
      expect.objectContaining({ agencyId: AGENCY, amount: 40, reason: "credit_topup_v2", idempotencyKey: `purchase:${AGENCY}:cs_credits_1` }),
    ]);
    // jednorazové kredity nejdú cez grant (grant expiruje, purchased nie)
    expect(rpc.grantCalls).toHaveLength(0);
  });

  it("duplicate and concurrent delivery credit once", async () => {
    await Promise.all([fulfillPricingV2CreditsCheckout(creditsSession()), fulfillPricingV2CreditsCheckout(creditsSession())]);
    expect(await fulfillPricingV2CreditsCheckout(creditsSession())).toBe(true);
    expect([...ledger.values()]).toEqual([40]);
  });

  it("different sessions credit separately", async () => {
    await fulfillPricingV2CreditsCheckout(creditsSession());
    await fulfillPricingV2CreditsCheckout(creditsSession({ id: "cs_credits_2" }));
    expect(ledger.size).toBe(2);
  });

  it("invalid metadata or RPC failure is a failure, never a silent true", async () => {
    const badMetas: Array<Record<string, string>> = [
      { credits: "0" },
      { credits: "1.5" },
      { credits: "abc" },
      { agencyId: "" },
      { checkoutType: "x" },
    ];
    for (const meta of badMetas) {
      expect(await fulfillPricingV2CreditsCheckout(creditsSession({}, meta))).toBe(false);
    }
    expect(rpc.purchaseCalls).toHaveLength(0);
    rpc.failPurchase = true;
    expect(await fulfillPricingV2CreditsCheckout(creditsSession())).toBe(false);
  });

  it("unpaid session credits nothing", async () => {
    expect(await fulfillPricingV2CreditsCheckout(creditsSession({ payment_status: "unpaid" }))).toBe(true);
    expect(rpc.purchaseCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
describe("handlePricingCheckoutWebhook — v2 vetvy", () => {
  beforeEach(() => {
    db.agencies = [{ id: AGENCY, pricing_model: null, subscription_status: null, stripe_subscription_id: null }];
  });

  const ev = (type: string, session: unknown) => ({ id: "evt_1", type, data: { object: session } }) as never;

  it("routes pricing_v2 and pricing_v2_credits sessions to their fulfillment", async () => {
    expect(await handlePricingCheckoutWebhook(ev("checkout.session.completed", planSession()))).toBe(true);
    expect(db.agencies[0].pricing_model).toBe("v2");
    expect(await handlePricingCheckoutWebhook(ev("checkout.session.completed", creditsSession()))).toBe(true);
    expect(rpc.purchaseCalls).toHaveLength(1);
  });

  it("invalid v2 metadata -> false (route turns it into 500)", async () => {
    expect(await handlePricingCheckoutWebhook(ev("checkout.session.completed", planSession({}, { users: "x" })))).toBe(false);
    expect(await handlePricingCheckoutWebhook(ev("checkout.session.completed", creditsSession({}, { credits: "-1" })))).toBe(false);
  });

  it("async_payment_succeeded fulfils v2 credits and legacy seat once paid", async () => {
    expect(await handlePricingCheckoutWebhook(ev("checkout.session.async_payment_succeeded", creditsSession()))).toBe(true);
    expect(rpc.purchaseCalls).toHaveLength(1);
    const seat = {
      id: "cs_s",
      payment_status: "paid",
      customer: "cus_1",
      subscription: "sub_1",
      metadata: { checkoutType: "seat", agencyId: AGENCY, seatTier: "team", seatQuantity: "2" },
    };
    expect(await handlePricingCheckoutWebhook(ev("checkout.session.async_payment_succeeded", seat))).toBe(true);
    expect(db.agencyUpdates.length).toBeGreaterThan(0);
  });

  it("other event types are still ignored", async () => {
    expect(await handlePricingCheckoutWebhook(ev("invoice.paid", planSession()))).toBe(false);
    expect(rpc.grantCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
describe("subscription lifecycle for v3 prices (kritériá 4, 5)", () => {
  const V2_AGENCY = (over: Record<string, unknown> = {}): Row => ({
    id: AGENCY,
    pricing_model: "v2",
    pricing_band: "office",
    licensed_users: 10,
    seats: 10,
    pack_credits: 100,
    account_tier: "enterprise",
    subscription_status: "active",
    stripe_subscription_id: "sub_1",
    ...over,
  });
  const subEvent = (type: string, sub: Record<string, unknown>) =>
    ({ id: "evt_s", type, data: { object: { id: "sub_1", status: "active", ...sub } } }) as never;
  /** Položky predplatného: [price, quantity] */
  const items = (...rows: Array<[string, number?]>) => ({
    items: { data: rows.map(([id, quantity]) => ({ quantity: quantity ?? 1, price: { id } })) },
  });
  const SEAT = PRICE.STRIPE_PRICE_V3_SEAT_MONTHLY;

  /** Live Stripe state drives writes; event payload alone must not. Položky: [price, quantity]. */
  function liveSub(status: string, ...rows: Array<[string, number?]>) {
    h.subRetrieve.mockImplementation(async (id: string) => ({
      id,
      status,
      customer: "cus_test",
      ...items(...rows),
    }));
  }
  const PACK100 = PRICE.STRIPE_PRICE_V3_PACK_100;

  beforeEach(() => {
    stubAllPrices();
    db.agencies = [V2_AGENCY()];
    liveSub("active", [SEAT, 10], [PACK100]);
  });

  it("updated: zmena quantity 10 -> 4 prepíše licensed_users, seats, pásmo aj tier a zruší balík", async () => {
    liveSub("active", [SEAT, 4]);
    const ok = await applyPricingV2SubscriptionEvent(subEvent("customer.subscription.updated", items([SEAT, 4])));
    expect(ok).toBe(true);
    expect(db.agencies[0]).toMatchObject({
      pricing_band: "team",
      account_tier: "pro",
      licensed_users: 4,
      seats: 4,
      pack_credits: 0,
      subscription_status: "active",
    });
  });

  it("updated: quantity (zo živého Stripe) cez hranice pásiem prepisuje pásmo (1 / 2 / 5 / 6 / 10 / 11 / 40)", async () => {
    const seen: Array<[number, unknown, unknown]> = [];
    for (const q of [1, 2, 5, 6, 10, 11, 40]) {
      db.agencies = [V2_AGENCY()];
      liveSub("active", [SEAT, q]);
      await applyPricingV2SubscriptionEvent(subEvent("customer.subscription.updated", items([SEAT, q])));
      seen.push([q, db.agencies[0].pricing_band, db.agencies[0].licensed_users]);
    }
    expect(seen).toEqual([
      [1, "start", 1],
      [2, "team", 2],
      [5, "team", 5],
      [6, "office", 6],
      [10, "office", 10],
      [11, "network", 11],
      [40, "network", 40],
    ]);
  });

  it("updated: quantity berie zo živého Stripe, nie z payloadu udalosti", async () => {
    liveSub("active", [SEAT, 7]);
    await applyPricingV2SubscriptionEvent(subEvent("customer.subscription.updated", items([SEAT, 2])));
    expect(db.agencies[0]).toMatchObject({ pricing_band: "office", licensed_users: 7, seats: 7 });
  });

  it("updated: ročná cena licencie sa správa rovnako (plán sa nemení na free)", async () => {
    liveSub("active", [PRICE.STRIPE_PRICE_V3_SEAT_YEARLY, 7]);
    await applyPricingV2SubscriptionEvent(subEvent("customer.subscription.updated", items([PRICE.STRIPE_PRICE_V3_SEAT_YEARLY, 7])));
    expect(db.agencies[0]).toMatchObject({ pricing_band: "office", licensed_users: 7, seats: 7, account_tier: "enterprise" });
  });

  it("updated: pack change is read from items in any order", async () => {
    liveSub("active", [PRICE.STRIPE_PRICE_V3_PACK_300], [SEAT, 8]);
    await applyPricingV2SubscriptionEvent(
      subEvent("customer.subscription.updated", items([PRICE.STRIPE_PRICE_V3_PACK_300], [SEAT, 8])),
    );
    expect(db.agencies[0]).toMatchObject({ pricing_band: "office", licensed_users: 8, pack_credits: 300 });
  });

  it("updated: past_due stops grants; unpaid / canceled / incomplete_expired revoke to free", async () => {
    liveSub("past_due", [SEAT, 10]);
    db.agencies = [V2_AGENCY()];
    // office 120 + balík 100
    expect(monthlyGrantAmountForAgency(db.agencies[0] as never)).toBe(220);
    await applyPricingV2SubscriptionEvent(
      subEvent("customer.subscription.updated", { status: "past_due", ...items([SEAT, 10]) }),
    );
    expect(db.agencies[0].subscription_status).toBe("past_due");
    expect(db.agencies[0].account_tier).toBe("enterprise");
    expect(monthlyGrantAmountForAgency(db.agencies[0] as never)).toBe(0);

    for (const status of ["unpaid", "canceled", "incomplete_expired"]) {
      db.agencies = [V2_AGENCY()];
      db.agencyUpdates = [];
      db.profileUpdates = [];
      expect(monthlyGrantAmountForAgency(db.agencies[0] as never)).toBe(220);
      liveSub(status, [SEAT, 10]);
      await applyPricingV2SubscriptionEvent(
        subEvent("customer.subscription.updated", { status, ...items([SEAT, 10]) }),
      );
      expect(db.agencies[0]).toMatchObject({
        subscription_status: "canceled",
        account_tier: "free",
        pack_credits: 0,
      });
      expect(monthlyGrantAmountForAgency(db.agencies[0] as never)).toBe(0);
    }
  });

  it("recovery: active again restores the grant", async () => {
    db.agencies = [V2_AGENCY({ subscription_status: "past_due" })];
    liveSub("active", [SEAT, 10], [PACK100]);
    await applyPricingV2SubscriptionEvent(
      subEvent("customer.subscription.updated", { status: "active", ...items([SEAT, 10], [PACK100]) }),
    );
    expect(monthlyGrantAmountForAgency(db.agencies[0] as never)).toBe(220);
  });

  it("stale past_due event does not overwrite live active (grants stay)", async () => {
    liveSub("active", [SEAT, 10], [PACK100]);
    await applyPricingV2SubscriptionEvent(
      subEvent("customer.subscription.updated", { status: "past_due", ...items([SEAT, 10]) }),
    );
    expect(db.agencies[0].subscription_status).toBe("active");
    expect(monthlyGrantAmountForAgency(db.agencies[0] as never)).toBe(220);
  });

  it("stale active event cannot reactivate a canceled live subscription", async () => {
    liveSub("canceled", [SEAT, 10]);
    await applyPricingV2SubscriptionEvent(
      subEvent("customer.subscription.updated", { status: "active", ...items([SEAT, 10], [PACK100]) }),
    );
    expect(db.agencies[0]).toMatchObject({
      subscription_status: "canceled",
      account_tier: "free",
      pack_credits: 0,
    });
    expect(monthlyGrantAmountForAgency(db.agencies[0] as never)).toBe(0);
  });

  it("deleted: status canceled, back to free, pack cleared, agency profiles downgraded, no grants", async () => {
    expect(
      await applyPricingV2SubscriptionEvent(
        subEvent("customer.subscription.deleted", { status: "canceled", ...items([SEAT, 10]) }),
      ),
    ).toBe(true);
    expect(db.agencies[0]).toMatchObject({
      subscription_status: "canceled",
      account_tier: "free",
      pack_credits: 0,
      pricing_model: "v2",
    });
    expect(db.profileUpdates[0]).toMatchObject({
      col: "agency_id",
      val: AGENCY,
      payload: { account_tier: "free", ui_role: "agent" },
    });
    expect(monthlyGrantAmountForAgency(db.agencies[0] as never)).toBe(0);
  });

  it("deleted event of an OLD subscription id never touches the agency's current subscription", async () => {
    const ok = await applyPricingV2SubscriptionEvent({
      id: "evt_old",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_OLD", status: "canceled", ...items([SEAT, 10]) } },
    } as never);
    expect(ok).toBe(true);
    expect(db.agencyUpdates).toHaveLength(0);
    expect(db.agencies[0].subscription_status).toBe("active");
  });

  it("created: no state change (checkout fulfillment owns the first write)", async () => {
    expect(await applyPricingV2SubscriptionEvent(subEvent("customer.subscription.created", items([SEAT, 3])))).toBe(true);
    expect(db.agencyUpdates).toHaveLength(0);
  });

  it("legacy agency found by subscription id is left alone", async () => {
    db.agencies = [V2_AGENCY({ pricing_model: null })];
    expect(await applyPricingV2SubscriptionEvent(subEvent("customer.subscription.updated", items([SEAT, 3])))).toBe(true);
    expect(db.agencyUpdates).toHaveLength(0);
  });

  it("DB failure / retrieve failure / missing live status → false so Stripe retries", async () => {
    liveSub("active", [SEAT, 3]);
    db.updateError = { message: "boom" };
    expect(await applyPricingV2SubscriptionEvent(subEvent("customer.subscription.updated", items([SEAT, 3])))).toBe(false);
    expect(await applyPricingV2SubscriptionEvent(subEvent("customer.subscription.deleted", items([SEAT, 3])))).toBe(false);
    db.updateError = null;
    db.readError = { message: "db down" };
    expect(await applyPricingV2SubscriptionEvent(subEvent("customer.subscription.updated", items([SEAT, 3])))).toBe(false);
    db.readError = null;

    h.subRetrieve.mockRejectedValueOnce(Object.assign(new Error("stripe down"), { code: "api_error" }));
    expect(await applyPricingV2SubscriptionEvent(subEvent("customer.subscription.updated", items([SEAT, 3])))).toBe(false);

    h.subRetrieve.mockImplementation(async (id: string) => ({ id, status: "", customer: "cus_test", ...items([SEAT, 3]) }));
    expect(await applyPricingV2SubscriptionEvent(subEvent("customer.subscription.updated", items([SEAT, 3])))).toBe(false);
  });

  it("updated bez jednej jednoznačnej licenčnej položky alebo bez čitateľnej quantity synchronizuje len stav", async () => {
    // dve licenčné položky (živý stav)
    liveSub("past_due", [SEAT, 2], [PRICE.STRIPE_PRICE_V3_SEAT_YEARLY, 3]);
    await applyPricingV2SubscriptionEvent(
      subEvent("customer.subscription.updated", { status: "past_due", ...items([SEAT, 2], [PRICE.STRIPE_PRICE_V3_SEAT_YEARLY, 3]) }),
    );
    expect(db.agencies[0]).toMatchObject({ subscription_status: "past_due", pricing_band: "office", licensed_users: 10, pack_credits: 100 });
    // quantity chýba / je neplatná
    for (const quantity of [undefined, null, 0, 2.5]) {
      db.agencies = [V2_AGENCY()];
      h.subRetrieve.mockImplementation(async (id: string) => ({
        id,
        status: "active",
        customer: "cus_test",
        items: { data: [{ quantity, price: { id: SEAT } }] },
      }));
      await applyPricingV2SubscriptionEvent(
        subEvent("customer.subscription.updated", { items: { data: [{ quantity, price: { id: SEAT } }] } }),
      );
      expect(db.agencies[0]).toMatchObject({ pricing_band: "office", licensed_users: 10, seats: 10 });
    }
  });

  it("readPricingV2SubscriptionItems: quantity -> pásmo, balík z ľubovoľného poradia", () => {
    expect(readPricingV2SubscriptionItems(items([PRICE.STRIPE_PRICE_V3_PACK_200], [SEAT, 21]))).toEqual({
      band: "network",
      seatQuantity: 21,
      packCredits: 200,
    });
    expect(readPricingV2SubscriptionItems(items([PRICE.STRIPE_PRICE_V3_PACK_200]))).toEqual({
      band: null,
      seatQuantity: null,
      packCredits: 200,
    });
  });

  it("clampLicensedUsers pásmo neorezáva: quantity je pravda, neplatná hodnota ide na zálohu (min. 1)", () => {
    expect(clampLicensedUsers(4)).toBe(4);
    expect(clampLicensedUsers(10)).toBe(10);
    expect(clampLicensedUsers(80)).toBe(80);
    expect(clampLicensedUsers(1)).toBe(1);
    expect(clampLicensedUsers(null, 7)).toBe(7);
    expect(clampLicensedUsers(0, 7)).toBe(7);
    expect(clampLicensedUsers(2.5, 7)).toBe(7);
    expect(clampLicensedUsers(undefined)).toBe(1);
    expect(clampLicensedUsers(null, 0)).toBe(1);
  });
});
