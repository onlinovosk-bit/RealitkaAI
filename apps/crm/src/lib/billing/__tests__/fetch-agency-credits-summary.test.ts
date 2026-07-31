import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAgencyCreditsSummary } from "@/lib/billing/fetch-agency-credits-summary";

vi.mock("@/lib/auth", () => ({
  getAgencyIdForAuthUser: vi.fn(),
}));

import { getAgencyIdForAuthUser } from "@/lib/auth";

describe("fetchAgencyCreditsSummary", () => {
  const mockGetAgencyId = vi.mocked(getAgencyIdForAuthUser);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when agency is missing", async () => {
    mockGetAgencyId.mockResolvedValue(null);
    const supabase = {} as SupabaseClient;
    await expect(fetchAgencyCreditsSummary(supabase, "user-1")).resolves.toBeNull();
  });

  it("maps agency row to credit summary with monthly grant hint", async () => {
    mockGetAgencyId.mockResolvedValue("agency-1");
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        credits_balance: 120,
        grant_credits_balance: 50,
        purchased_credits_balance: 70,
        seats: 3,
        account_tier: "active_force",
        owner_cockpit_active: false,
      },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const supabase = { from } as unknown as SupabaseClient;

    const summary = await fetchAgencyCreditsSummary(supabase, "user-1");

    expect(summary).toEqual({
      creditsBalance: 120,
      grantBalance: 50,
      purchasedBalance: 70,
      monthlyGrantCredits: 75,
    });
    expect(from).toHaveBeenCalledWith("agencies");
  });
});
