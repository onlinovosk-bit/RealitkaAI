import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleClient: () => null }));
vi.mock("@/lib/credits/mutate-credits", () => ({
  applyMonthlyGrantCredits: vi.fn(),
  expireGrantCreditsAtomic: vi.fn(),
}));

import { monthlyGrantAmountForAgency, type AgencyCreditRow } from "@/lib/credits/grant-engine";
import { PRICING_V2_MONTHLY_PACKS } from "@/lib/pricing-v2";

// Cenník v3: pásmo grantu sa odvodzuje z `licensed_users` (1 / 2–5 / 6–10 / 11+), nie z uloženého pásma.
// Mesačný grant kancelárie ostáva 25 / 60 / 120 / 175 (v3 ho nemení) + pack_credits.

const v3 = (overrides: Partial<AgencyCreditRow> = {}): AgencyCreditRow => ({
  id: "ag-1",
  seats: 3,
  account_tier: "pro",
  grant_credits_balance: 0,
  purchased_credits_balance: 0,
  owner_cockpit_active: false,
  credits_balance: 0,
  pricing_model: "v2",
  pricing_band: "team",
  licensed_users: 3,
  pack_credits: 0,
  subscription_status: "active",
  ...overrides,
});

describe("grant-engine × cenník v3 (pásmo z licensed_users)", () => {
  it("grant podľa pásma z licensed_users na hraniciach 1 / 2 / 5 / 6 / 10 / 11 / 60", () => {
    const grantAt = (licensed_users: number) =>
      monthlyGrantAmountForAgency(v3({ licensed_users, seats: licensed_users, pricing_band: null }));
    expect([1, 2, 5, 6, 10, 11, 60].map(grantAt)).toEqual([25, 60, 60, 120, 120, 175, 175]);
  });

  it("licensed_users má prednosť pred uloženým pricing_band (zmena quantity bez prepisu pásma sa neprejaví starým grantom)", () => {
    expect(monthlyGrantAmountForAgency(v3({ licensed_users: 12, pricing_band: "team" }))).toBe(175);
    expect(monthlyGrantAmountForAgency(v3({ licensed_users: 1, pricing_band: "network" }))).toBe(25);
  });

  it("grant = pásmo + pack_credits pre všetky nové veľkosti balíkov 50–300", () => {
    expect(PRICING_V2_MONTHLY_PACKS.map((p) => p.credits)).toEqual([50, 100, 150, 200, 250, 300]);
    for (const pack of PRICING_V2_MONTHLY_PACKS.map((p) => p.credits)) {
      expect(monthlyGrantAmountForAgency(v3({ licensed_users: 3, pack_credits: pack }))).toBe(60 + pack);
      expect(monthlyGrantAmountForAgency(v3({ licensed_users: 8, pack_credits: pack }))).toBe(120 + pack);
      expect(monthlyGrantAmountForAgency(v3({ licensed_users: 40, pack_credits: pack }))).toBe(175 + pack);
    }
  });

  it("počet maklérov grant nenásobí (kancelária, nie používateľ)", () => {
    expect(monthlyGrantAmountForAgency(v3({ licensed_users: 9, seats: 9 }))).toBe(120);
    expect(monthlyGrantAmountForAgency(v3({ licensed_users: 9, seats: 500 }))).toBe(120);
  });

  it("bez licensed_users (riadok bez stĺpca) sa použije uložené pricing_band", () => {
    expect(monthlyGrantAmountForAgency(v3({ licensed_users: undefined, pricing_band: "office" }))).toBe(120);
    expect(monthlyGrantAmountForAgency(v3({ licensed_users: null, pricing_band: "network", pack_credits: 50 }))).toBe(225);
  });

  it("fail-closed: neplatné licensed_users alebo žiadne pásmo = 0, nikdy legacy seat výpočet", () => {
    for (const licensed_users of [0, -3, 2.5, Number.NaN]) {
      expect(monthlyGrantAmountForAgency(v3({ licensed_users }))).toBe(0);
    }
    expect(monthlyGrantAmountForAgency(v3({ licensed_users: null, pricing_band: null }))).toBe(0);
    expect(monthlyGrantAmountForAgency(v3({ licensed_users: undefined, pricing_band: "mega" }))).toBe(0);
  });

  it("grant ide len pri aktívnom predplatnom", () => {
    for (const status of ["past_due", "unpaid", "canceled", "incomplete_expired", "paused", null, undefined]) {
      expect(monthlyGrantAmountForAgency(v3({ subscription_status: status as never, pack_credits: 100 }))).toBe(0);
    }
  });
});
