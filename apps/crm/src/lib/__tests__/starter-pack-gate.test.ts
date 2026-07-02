import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isStarterPackCheckoutAvailable,
  getStarterPackStripePriceId,
  STARTER_PACK,
} from "@/lib/program-tier-pricing";

describe("starter pack checkout gate", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("is unavailable without STRIPE_PRICE_STARTER_PACK", () => {
    delete process.env.STRIPE_PRICE_STARTER_PACK;
    expect(isStarterPackCheckoutAvailable()).toBe(false);
    expect(getStarterPackStripePriceId()).toBe("");
  });

  it("is available when env price is set", () => {
    process.env.STRIPE_PRICE_STARTER_PACK = "price_starter_pack";
    expect(isStarterPackCheckoutAvailable()).toBe(true);
    expect(getStarterPackStripePriceId()).toBe("price_starter_pack");
  });

  it("exposes fixed product metadata", () => {
    expect(STARTER_PACK.priceEur).toBe(47);
    expect(STARTER_PACK.creditValue).toBe(47);
    expect(STARTER_PACK.checkoutType).toBe("starter_pack");
  });
});
