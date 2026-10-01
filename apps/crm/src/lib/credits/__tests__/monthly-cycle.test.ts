import { describe, it, expect, vi, beforeEach } from "vitest";
import { runMonthlyCreditCycle } from "@/lib/credits/monthly-cycle";

const expireMock = vi.fn();
const grantMock = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    from: mockFrom,
  }),
}));

vi.mock("@/lib/credits/grant-engine", async () => {
  const actual = await vi.importActual<typeof import("@/lib/credits/grant-engine")>(
    "@/lib/credits/grant-engine",
  );
  return {
    ...actual,
    expireGrantCreditsForAgency: (...args: unknown[]) => expireMock(...args),
    grantMonthlyCreditsForAgency: (...args: unknown[]) => grantMock(...args),
  };
});

const agencyA = {
  id: "agency-a",
  seats: 2,
  account_tier: "pro",
  grant_credits_balance: 40,
  purchased_credits_balance: 10,
  owner_cockpit_active: false,
  credits_balance: 50,
};

const agencyB = {
  id: "agency-b",
  seats: 1,
  account_tier: "pro",
  grant_credits_balance: 20,
  purchased_credits_balance: 0,
  owner_cockpit_active: false,
  credits_balance: 20,
};

describe("runMonthlyCreditCycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => ({
      select: () => ({
        gt: () =>
          Promise.resolve({
            data: [agencyA, agencyB],
            error: null,
          }),
      }),
    }));
  });

  it("skips grant for agencies whose expire hard-failed and returns ok:false", async () => {
    expireMock
      .mockResolvedValueOnce({
        expired: 0,
        skipped: true,
        error: "ledger insert failed",
      })
      .mockResolvedValueOnce({ expired: 20, skipped: false });
    grantMock.mockResolvedValue({ granted: 50, skipped: false });

    const result = await runMonthlyCreditCycle();

    expect(result.ok).toBe(false);
    expect(result.error).toBe("expire_failed:1");
    // agency-a skipped; agency-b granted
    expect(grantMock).toHaveBeenCalledTimes(1);
    expect(grantMock.mock.calls[0][0].id).toBe("agency-b");
    expect(result.grant.grantedTotal).toBe(50);
    expect(result.grant.skipped).toBe(1);
  });

  it("returns ok:true when expire only soft-skips", async () => {
    expireMock.mockResolvedValue({ expired: 0, skipped: true });
    grantMock.mockResolvedValue({ granted: 0, skipped: true });

    const result = await runMonthlyCreditCycle();

    expect(result.ok).toBe(true);
    expect(grantMock).toHaveBeenCalledTimes(2);
  });
});
