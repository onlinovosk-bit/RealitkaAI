import { describe, it, expect, vi, beforeEach } from "vitest";

const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();
const applyCreditPurchaseMock = vi.fn();

/** Claim chain: update().eq().is().select().maybeSingle() */
function buildClaimChain(result: { data: unknown; error?: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ maybeSingle });
  const is = vi.fn().mockReturnValue({ select });
  const eq = vi.fn().mockReturnValue({ is });
  return { eq, is, select, maybeSingle };
}

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
  let claimChain: ReturnType<typeof buildClaimChain>;
  let agencyUpdateEq: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle, is: mockIs });
    mockIs.mockReturnValue({ eq: mockEq });
    mockUpdate.mockReturnValue({ eq: mockEq });
    claimChain = buildClaimChain({ data: { id: "code-row-1" } });
    agencyUpdateEq = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "credit_redemption_codes") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockMaybeSingle,
            }),
          }),
          update: (...args: unknown[]) => {
            mockUpdate(...args);
            return claimChain;
          },
        };
      }
      return {};
    });

    applyCreditPurchaseMock.mockResolvedValue({ ok: true, credited: 47, skipped: false });
  });

  it("grants purchased credits via atomic RPC and marks code redeemed", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      if (table === "credit_ledger") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockMaybeSingle,
            }),
          }),
          insert: mockInsert,
        };
      }
      if (table === "agencies") {
        return {
          select: () => ({
            eq: () => ({
              single: mockSingle,
            }),
          }),
          update: (...args: unknown[]) => {
            mockUpdate(...args);
            return { eq: agencyUpdateEq };
          },
        };
      }
      return {};
    });

    mockInsert.mockResolvedValue({ error: null });
  });

  it("claims code before granting purchased credits", async () => {
    // 1) lookup code  2) ledger idempotency check
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
    expect(mockUpdate).toHaveBeenCalledWith({
      redeemed_by_agency: "agency-1",
      redeemed_at: expect.any(String),
    });
    expect(claimChain.eq).toHaveBeenCalledWith("id", "code-row-1");
    expect(claimChain.is).toHaveBeenCalledWith("redeemed_at", null);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId: "agency-1",
        amount: 47,
        reason: "starter_pack_redeem",
        idempotencyKey: "starter_pack_redeem:code-row-1:agency-1",
      }),
    );
  });

  it("rejects when another agency already claimed the code (lost race)", async () => {
    claimChain = buildClaimChain({ data: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "credit_redemption_codes") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockMaybeSingle,
            }),
          }),
          update: (...args: unknown[]) => {
            mockUpdate(...args);
            return claimChain;
          },
        };
      }
      if (table === "credit_ledger") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockMaybeSingle,
            }),
          }),
          insert: mockInsert,
        };
      }
      return {};
    });

    mockMaybeSingle
      .mockResolvedValueOnce({
        data: {
          id: "code-row-1",
          code: "REV-47-RACE01",
          value: 47,
          redeemed_by_agency: null,
          redeemed_at: null,
        },
      })
      // re-read after lost claim
      .mockResolvedValueOnce({
        data: {
          id: "code-row-1",
          value: 47,
          redeemed_by_agency: "agency-other",
          redeemed_at: "2026-08-12T00:00:00Z",
        },
      });

    const result = await redeemStarterPackCode({
      code: "REV-47-RACE01",
      agencyId: "agency-1",
    });

    expect(result).toEqual({ ok: false, error: "code_already_used" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("is idempotent when same agency redeems again (ledger present)", async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({
        data: {
          id: "code-row-2",
          code: "REV-47-DUP999",
          value: 47,
          redeemed_by_agency: "agency-1",
          redeemed_at: "2026-06-01T00:00:00Z",
        },
      })
      .mockResolvedValueOnce({ data: { id: "ledger-1" } });

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

  it("retries credit grant when code is claimed by us but ledger is missing", async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({
        data: {
          id: "code-row-4",
          code: "REV-47-RETRY1",
          value: 47,
          redeemed_by_agency: "agency-1",
          redeemed_at: "2026-08-12T00:00:00Z",
        },
      })
      .mockResolvedValueOnce({ data: null });

    mockSingle.mockResolvedValue({
      data: {
        purchased_credits_balance: 0,
        grant_credits_balance: 0,
        credits_balance: 0,
      },
    });

    const result = await redeemStarterPackCode({
      code: "REV-47-RETRY1",
      agencyId: "agency-1",
    });

    expect(result).toEqual({
      ok: true,
      creditsGranted: 47,
      alreadyRedeemed: false,
    });
    expect(mockInsert).toHaveBeenCalled();
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
