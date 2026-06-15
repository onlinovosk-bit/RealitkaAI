import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isMigrationDfyCheckoutAvailable,
  getMigrationDfyStripePriceId,
  MIGRATION_DFY,
} from "@/lib/program-tier-pricing";

describe("migration DFY order bump gate", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("is unavailable without STRIPE_PRICE_MIGRATION_DFY", () => {
    delete process.env.STRIPE_PRICE_MIGRATION_DFY;
    expect(isMigrationDfyCheckoutAvailable()).toBe(false);
    expect(getMigrationDfyStripePriceId()).toBe("");
  });

  it("is available when env price is set", () => {
    process.env.STRIPE_PRICE_MIGRATION_DFY = "price_migration_dfy";
    expect(isMigrationDfyCheckoutAvailable()).toBe(true);
    expect(getMigrationDfyStripePriceId()).toBe("price_migration_dfy");
  });

  it("exposes fixed product metadata", () => {
    expect(MIGRATION_DFY.priceEur).toBe(99);
    expect(MIGRATION_DFY.type).toBe("migration_dfy");
  });
});
