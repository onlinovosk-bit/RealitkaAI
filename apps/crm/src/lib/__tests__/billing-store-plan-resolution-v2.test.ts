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

const V3 = {
  STRIPE_PRICE_V3_SEAT_MONTHLY: "price_1V3seatMonthly01",
  STRIPE_PRICE_V3_SEAT_YEARLY: "price_1V3seatYearly001",
  STRIPE_PRICE_V3_PACK_50: "price_1V3pack50Abcdef",
  STRIPE_PRICE_V3_CREDIT: "price_1V3creditAbcdef",
};

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  for (const [k, v] of Object.entries(V3)) vi.stubEnv(k, v);
  vi.stubEnv("STRIPE_PRICE_STARTER", "price_1LegacyStarterAb");
  vi.stubEnv("STRIPE_PRICE_PRO", "price_1LegacyProAbcdef");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("resolvePlanKeyFromStripePriceId × cenník v3", () => {
  it("licencia dáva plán podľa quantity (pásmo 1 / 2–5 / 6–10 / 11+), rovnako ako legacy seat tier", () => {
    const at = (q: number | null | undefined, id = V3.STRIPE_PRICE_V3_SEAT_MONTHLY) => resolvePlanKeyFromStripePriceId(id, q);
    expect(at(1)).toBe("starter");
    expect(at(2)).toBe("pro");
    expect(at(5)).toBe("pro");
    expect(at(6)).toBe("enterprise");
    expect(at(10)).toBe("enterprise");
    expect(at(11)).toBe("enterprise");
    expect(at(60)).toBe("enterprise");
  });

  it("ročná cena licencie dáva rovnaký plán ako mesačná", () => {
    expect(resolvePlanKeyFromStripePriceId(V3.STRIPE_PRICE_V3_SEAT_YEARLY, 1)).toBe("starter");
    expect(resolvePlanKeyFromStripePriceId(V3.STRIPE_PRICE_V3_SEAT_YEARLY, 3)).toBe("pro");
  });

  it("licencia bez čitateľnej quantity je unknown (tier sa nezmení), nikdy free", () => {
    for (const q of [undefined, null, 0, -1, 1.5]) {
      expect(resolvePlanKeyFromStripePriceId(V3.STRIPE_PRICE_V3_SEAT_MONTHLY, q)).toBe("unknown");
    }
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("balík kreditov a kredit plán neurčujú (unknown), a bez hlučného varovania", () => {
    expect(resolvePlanKeyFromStripePriceId(V3.STRIPE_PRICE_V3_PACK_50, 5)).toBe("unknown");
    expect(resolvePlanKeyFromStripePriceId(V3.STRIPE_PRICE_V3_CREDIT, 5)).toBe("unknown");
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
