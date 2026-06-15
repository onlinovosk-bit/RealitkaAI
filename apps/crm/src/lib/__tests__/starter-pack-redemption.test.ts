import { describe, it, expect, vi, beforeEach } from "vitest";
import { redeemStarterPackCode } from "@/lib/starter-pack/redemption";

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockIs = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    from: mockFrom,
  }),
}));

describe("starter pack code redemption", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle, single: mockSingle, is: mockIs });
    mockIs.mockReturnValue({ eq: mockEq });
    mockUpdate.mockReturnValue({ eq: mockEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === "credit_redemption_codes") {
        return {
          select: () => ({ eq: mockEq }),
          update: mockUpdate,
        };
      }
      if (table === "credit_ledger") {
        return {
          select: () => ({ eq: mockEq }),
          insert: mockInsert,
        };
      }
      if (table === "agencies") {
        return {
          select: () => ({ eq: mockEq }),
          update: mockUpdate,
        };
      }
      return {};
    });

    mockInsert.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
  });

  it("grants purchased credits and marks code redeemed", async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({
        data: {
          id: "code-row-1",
          code: "REV-47-ABC123",
          value: 47,
          redeemed_by_agency: null,
          redeemed_at: null,
        },
      })
      .mockResolvedValueOnce({ data: null });

    mockSingle.mockResolvedValue({
      data: {
        purchased_credits_balance: 10,
        grant_credits_balance: 20,
        credits_balance: 30,
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

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        agency_id: "agency-1",
        delta: 47,
        reason: "starter_pack_redeem",
        source: "purchase",
        idempotency_key: "starter_pack_redeem:code-row-1:agency-1",
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
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects code already used by another agency", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "code-row-3",
        code: "REV-47-USED01",
        value: 47,
        redeemed_by_agency: "agency-other",
        redeemed_at: "2026-06-01T00:00:00Z",
      },
    });

    const result = await redeemStarterPackCode({
      code: "REV-47-USED01",
      agencyId: "agency-1",
    });

    expect(result).toEqual({ ok: false, error: "code_already_used" });
  });
});
