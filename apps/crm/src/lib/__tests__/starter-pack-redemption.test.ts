import { describe, it, expect, vi, beforeEach } from "vitest";
import { redeemStarterPackCode } from "@/lib/starter-pack/redemption";

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();

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

describe("starter pack code redemption", () => {
  let claimChain: ReturnType<typeof buildClaimChain>;
  let agencyUpdateEq: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(mockUpdate).toHaveBeenCalledWith({
      redeemed_by_agency: "agency-1",
      redeemed_at: expect.any(String),
    });
    expect(claimChain.eq).toHaveBeenCalledWith("id", "code-row-1");
    expect(claimChain.is).toHaveBeenCalledWith("redeemed_at", null);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        agency_id: "agency-1",
        delta: 47,
        reason: "starter_pack_redeem",
        source: "purchase",
        idempotency_key: "starter_pack_redeem:code-row-1:agency-1",
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
    expect(mockInsert).not.toHaveBeenCalled();
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
