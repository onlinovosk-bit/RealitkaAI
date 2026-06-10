import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  CREDIT_GRANTS,
  CREDIT_ACTION_COSTS,
  COCKPIT_PRODUCTS,
  COCKPIT_LITE_MIN_SEATS,
  TOPUP_PACKAGES,
  SEAT_TIER_CONFIG,
  PLAN_PRICES_EUR,
  parseSeatTier,
  parseTopupPackageKey,
  monthlySeatGrantCredits,
  monthlyAgencyGrantCredits,
  cockpitLiteEligible,
  ownerCockpitPriceEur,
  getTopupStripePriceId,
  areSeatCheckoutPricesConfigured,
} from "@/lib/program-tier-pricing";

describe("program-tier-pricing v1.0", () => {
  describe("CREDIT_GRANTS", () => {
    it("matches seat tier table", () => {
      expect(CREDIT_GRANTS.solo).toBe(30);
      expect(CREDIT_GRANTS.team).toBe(25);
      expect(CREDIT_GRANTS.office).toBe(20);
    });
  });

  describe("COCKPIT_PRODUCTS", () => {
    it("lite is free at 3+ seats", () => {
      expect(COCKPIT_PRODUCTS.lite.priceEur).toBe(0);
      expect(COCKPIT_LITE_MIN_SEATS).toBe(3);
    });

    it("owner cockpit has grant and founder price", () => {
      expect(COCKPIT_PRODUCTS.owner.priceEur).toBe(349);
      expect(COCKPIT_PRODUCTS.owner.grantCredits).toBe(100);
      expect(COCKPIT_PRODUCTS.owner.founderPriceEur).toBe(249);
      expect(COCKPIT_PRODUCTS.owner.enabled).toBe(true);
    });

    it("owner pro is disabled for sale", () => {
      expect(COCKPIT_PRODUCTS.ownerPro.enabled).toBe(false);
      expect(COCKPIT_PRODUCTS.ownerPro.priceEur).toBe(499);
    });
  });

  describe("CREDIT_ACTION_COSTS", () => {
    it("defines spotrebný cenník", () => {
      expect(CREDIT_ACTION_COSTS.leadUnlock).toBe(4);
      expect(CREDIT_ACTION_COSTS.leadAnalysis).toBe(1);
      expect(CREDIT_ACTION_COSTS.aiEmail).toBe(1);
      expect(CREDIT_ACTION_COSTS.listingDescription).toBe(2);
    });
  });

  describe("TOPUP_PACKAGES", () => {
    it("defines four one-time balíčky", () => {
      expect(TOPUP_PACKAGES.start).toEqual(
        expect.objectContaining({ credits: 50, priceEur: 49 }),
      );
      expect(TOPUP_PACKAGES.rast).toEqual(
        expect.objectContaining({ credits: 150, priceEur: 129, featured: true }),
      );
      expect(TOPUP_PACKAGES.pro).toEqual(
        expect.objectContaining({ credits: 500, priceEur: 379 }),
      );
      expect(TOPUP_PACKAGES.mega).toEqual(
        expect.objectContaining({ credits: 1500, priceEur: 999 }),
      );
    });

    it("maps stripe env keys", () => {
      expect(TOPUP_PACKAGES.start.stripeEnvKey).toBe("STRIPE_PRICE_CREDITS_START");
      expect(TOPUP_PACKAGES.rast.stripeEnvKey).toBe("STRIPE_PRICE_CREDITS_RAST");
    });
  });

  describe("SEAT_TIER_CONFIG", () => {
    it("aligns prices and min seats", () => {
      expect(SEAT_TIER_CONFIG.solo.priceEur).toBe(PLAN_PRICES_EUR.soloSeat);
      expect(SEAT_TIER_CONFIG.solo.minSeats).toBe(1);
      expect(SEAT_TIER_CONFIG.team.minSeats).toBe(3);
      expect(SEAT_TIER_CONFIG.office.minSeats).toBe(10);
    });
  });

  describe("parseSeatTier", () => {
    it("parses aliases", () => {
      expect(parseSeatTier("solo")).toBe("solo");
      expect(parseSeatTier("smart-start")).toBe("solo");
      expect(parseSeatTier("active-force")).toBe("team");
      expect(parseSeatTier("market-vision")).toBe("office");
      expect(parseSeatTier(null)).toBe("team");
    });
  });

  describe("parseTopupPackageKey", () => {
    it("parses valid keys only", () => {
      expect(parseTopupPackageKey("rast")).toBe("rast");
      expect(parseTopupPackageKey("MEGA")).toBe("mega");
      expect(parseTopupPackageKey("invalid")).toBeNull();
    });
  });

  describe("grant helpers", () => {
    it("monthlySeatGrantCredits multiplies per seat", () => {
      expect(monthlySeatGrantCredits("team", 5)).toBe(5 * 25);
    });

    it("monthlyAgencyGrantCredits adds cockpit grant", () => {
      expect(
        monthlyAgencyGrantCredits({
          seatTier: "solo",
          seatCount: 1,
          ownerCockpitActive: true,
        }),
      ).toBe(30 + 100);
    });

    it("cockpitLiteEligible at 3+ seats", () => {
      expect(cockpitLiteEligible(2)).toBe(false);
      expect(cockpitLiteEligible(3)).toBe(true);
    });
  });

  describe("ownerCockpitPriceEur", () => {
    it("returns founder price when eligible", () => {
      expect(ownerCockpitPriceEur({ founderEligible: true })).toBe(249);
      expect(ownerCockpitPriceEur({ founderEligible: false })).toBe(349);
    });
  });

  describe("stripe env helpers", () => {
    const prev = { ...process.env };

    beforeEach(() => {
      process.env.STRIPE_PRICE_CREDITS_START = "price_start_test";
    });

    afterEach(() => {
      process.env = { ...prev };
    });

    it("getTopupStripePriceId reads env", () => {
      expect(getTopupStripePriceId("start")).toBe("price_start_test");
    });

    it("areSeatCheckoutPricesConfigured false when missing", () => {
      expect(areSeatCheckoutPricesConfigured()).toBe(false);
    });
  });
});
