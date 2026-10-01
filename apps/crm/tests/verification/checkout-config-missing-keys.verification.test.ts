import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/billing/checkout-config/route";

const SEAT = ["STRIPE_PRICE_SOLO_SEAT", "STRIPE_PRICE_TEAM_SEAT", "STRIPE_PRICE_OFFICE_SEAT"];
const TOPUP = [
  "STRIPE_PRICE_CREDITS_START",
  "STRIPE_PRICE_CREDITS_RAST",
  "STRIPE_PRICE_CREDITS_PRO",
  "STRIPE_PRICE_CREDITS_MEGA",
];

async function config() {
  return (await GET()).json();
}

describe("checkout-config names the missing price env keys", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("lists every seat and top-up key when nothing is configured", async () => {
    for (const k of [...SEAT, ...TOPUP]) vi.stubEnv(k, "");
    const d = await config();
    expect(d.seatCheckoutAvailable).toBe(false);
    expect(d.missingPriceEnvKeys.seat).toEqual(SEAT);
    expect(d.missingPriceEnvKeys.topup).toEqual(TOPUP);
  });

  it("lists only the keys that are unset or placeholders", async () => {
    vi.stubEnv("STRIPE_PRICE_SOLO_SEAT", "price_1Abcdefgh");
    vi.stubEnv("STRIPE_PRICE_TEAM_SEAT", "price_xxx");
    vi.stubEnv("STRIPE_PRICE_OFFICE_SEAT", "");
    const d = await config();
    expect(d.missingPriceEnvKeys.seat).toEqual(["STRIPE_PRICE_TEAM_SEAT", "STRIPE_PRICE_OFFICE_SEAT"]);
  });

  it("is empty when all seat prices are valid, and never echoes values", async () => {
    SEAT.forEach((k, i) => vi.stubEnv(k, `price_1ValidKey${i}x`));
    const d = await config();
    expect(d.seatCheckoutAvailable).toBe(true);
    expect(d.missingPriceEnvKeys.seat).toEqual([]);
    expect(JSON.stringify(d)).not.toContain("price_1ValidKey");
  });
});
