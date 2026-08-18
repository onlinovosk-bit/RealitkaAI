import { describe, it, expect, vi, beforeEach } from "vitest";

const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockIs = vi.fn();
const mockFrom = vi.fn();
const applyCreditPurchaseMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    from: mockFrom,
  }),
}));

vi.mock("@/lib/credits/mutate-credits", () => ({
  applyCreditPurchase: (...args: unknown[]) => applyCreditPurchaseMock(...args),
}));

import { redeemStarterPackCode } from "@/lib/starter-pack/redemption";

describe("starter pack code redemption", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle, is: mockIs });
    mockIs.mockReturnValue({ eq: mockEq });
    mockUpdate.mockReturnValue({ eq: mockEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === "credit_redemption_codes") {
        return {
          select: () => ({ eq: mockEq }),
          update: mockUpdate,
        };
      }
      return {};
    });

    applyCreditPurchaseMock.mockResolvedValue({ ok: true, credited: 47, skipped: false });
  });

  it("grants purchased credits via atomic RPC and marks code redeemed", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "code-row-1",
        code: "REV-47-ABC123",
        value: 47,
        redeemed_by_agency: null,
        redeemed_at: null,
      },
    });

    const result = await redeemStarterPackCode({
      code: "rev-47-abc123",
      agencyId: "agency-1",
    });

    expect(result).toEqual({
      ok: true,
      creditsGranted: 47,
      alreadyRedeemed: false,
    });

    expect(applyCreditPurchaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId: "agency-1",
        amount: 47,
        reason: "starter_pack_redeem",
        idempotencyKey: "starter_pack_redeem:code-row-1:agency-1",
      }),
    );

    expect(mockUpdate).toHaveBeenCalled();
  });

  it("is idempotent when same agency redeems again", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "code-row-2",
        code: "REV-47-DUP999",
        value: 47,
        redeemed_by_agency: "agency-1",
        redeemed_at: "2026-06-01T00:00:00Z",
      },
    });

    const result = await redeemStarterPackCode({
      code: "REV-47-DUP999",
      agencyId: "agency-1",
    });

    expect(result).toEqual({
      ok: true,
      creditsGranted: 47,
      alreadyRedeemed: true,
    });
    expect(applyCreditPurchaseMock).not.toHaveBeenCalled();
  });

  it("rejects code already used by another agency", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "code-row-3",
        code: "REV-47-OTHER",
        value: 47,
        redeemed_by_agency: "other-agency",
        redeemed_at: "2026-06-01T00:00:00Z",
      },
    });

    const result = await redeemStarterPackCode({
      code: "REV-47-OTHER",
      agencyId: "agency-1",
    });

    expect(result).toEqual({ ok: false, error: "code_already_used" });
  });
});
