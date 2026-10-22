import { describe, expect, it } from "vitest";
import { validateEnv } from "./env";

const BASE_ENV = {
  NODE_ENV: "test",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
};

describe("env schema — pricing v3 plan Price IDs", () => {
  it("akceptuje všetkých 8 plánových Price ID aj dočasné fallback kľúče", () => {
    const result = validateEnv({
      ...BASE_ENV,
      STRIPE_PRICE_V3_START_MONTHLY: "price_start_month",
      STRIPE_PRICE_V3_START_YEARLY: "price_start_year",
      STRIPE_PRICE_V3_TEAM_MONTHLY: "price_team_month",
      STRIPE_PRICE_V3_TEAM_YEARLY: "price_team_year",
      STRIPE_PRICE_V3_KANCELARIA_MONTHLY: "price_kancelaria_month",
      STRIPE_PRICE_V3_KANCELARIA_YEARLY: "price_kancelaria_year",
      STRIPE_PRICE_V3_SIET_MONTHLY: "price_siet_month",
      STRIPE_PRICE_V3_SIET_YEARLY: "price_siet_year",
      STRIPE_PRICE_V3_SEAT_MONTHLY: "price_legacy_month",
      STRIPE_PRICE_V3_SEAT_YEARLY: "price_legacy_year",
    });

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });
});
