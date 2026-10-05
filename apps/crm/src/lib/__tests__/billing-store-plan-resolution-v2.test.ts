import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Platiaci v2 zákazník nesmie dostať plán „free“: plán sa zisťuje zo Stripe ceny predplatného
// a v2 price ID legacy mapa nepoznala (getCurrentPlanKey → free, limity a príznaky free).

vi.mock("stripe", () => ({
  default: vi.fn(function StripePlaceholder(this: Record<string, unknown>) {
    this.customers = { list: vi.fn(async () => ({ data: [] })), retrieve: vi.fn() };
    return undefined;
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabaseClient: { auth: { getUser: () => ({ data: { user: null } }) }, from: () => ({}) },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => null,
}));

import { resolvePlanKeyFromStripePriceId } from "@/lib/billing-store";

const V2 = {
  STRIPE_PRICE_V2_START: "price_1V2startAbcdefg",
  STRIPE_PRICE_V2_TEAM: "price_1V2teamAbcdefgh",
  STRIPE_PRICE_V2_OFFICE: "price_1V2officeAbcdef",
  STRIPE_PRICE_V2_NETWORK: "price_1V2networkAbcde",
  STRIPE_PRICE_V2_PACK_60: "price_1V2pack60Abcdef",
  STRIPE_PRICE_V2_CREDIT: "price_1V2creditAbcdef",
};

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  for (const [k, v] of Object.entries(V2)) vi.stubEnv(k, v);
  vi.stubEnv("STRIPE_PRICE_STARTER", "price_1LegacyStarterAb");
  vi.stubEnv("STRIPE_PRICE_PRO", "price_1LegacyProAbcdef");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("resolvePlanKeyFromStripePriceId × cenník v2", () => {
  it("v2 pásma dávajú plán rovnaký ako legacy seat tier: start → starter, team → pro, office a network → enterprise", () => {
    expect(resolvePlanKeyFromStripePriceId(V2.STRIPE_PRICE_V2_START)).toBe("starter");
    expect(resolvePlanKeyFromStripePriceId(V2.STRIPE_PRICE_V2_TEAM)).toBe("pro");
    expect(resolvePlanKeyFromStripePriceId(V2.STRIPE_PRICE_V2_OFFICE)).toBe("enterprise");
    expect(resolvePlanKeyFromStripePriceId(V2.STRIPE_PRICE_V2_NETWORK)).toBe("enterprise");
  });

  it("balík kreditov a kredit plán neurčujú (unknown), a bez hlučného varovania", () => {
    expect(resolvePlanKeyFromStripePriceId(V2.STRIPE_PRICE_V2_PACK_60)).toBe("unknown");
    expect(resolvePlanKeyFromStripePriceId(V2.STRIPE_PRICE_V2_CREDIT)).toBe("unknown");
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("legacy ceny sa správajú ako doteraz", () => {
    expect(resolvePlanKeyFromStripePriceId("price_1LegacyStarterAb")).toBe("starter");
    expect(resolvePlanKeyFromStripePriceId("price_1LegacyProAbcdef")).toBe("pro");
  });

  it("neznáma cena a prázdny vstup ostávajú unknown (nikdy tichý free)", () => {
    expect(resolvePlanKeyFromStripePriceId("price_1Unknown123456")).toBe("unknown");
    expect(resolvePlanKeyFromStripePriceId(null)).toBe("unknown");
    expect(resolvePlanKeyFromStripePriceId(undefined)).toBe("unknown");
  });

  it("bez nastavených v2 premenných nič nezhodne (undefined === undefined)", () => {
    vi.unstubAllEnvs();
    expect(resolvePlanKeyFromStripePriceId("price_1Whatever12345")).toBe("unknown");
  });
});
