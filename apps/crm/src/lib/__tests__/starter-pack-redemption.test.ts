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

  beforeEach(() => {
    vi.clearAllMocks();
    claimChain = buildClaimChain({ data: { id: "code-row-1" } });

    // Po prechode na apply_credit_purchase sa tu už nečíta ani credit_ledger,
    // ani agencies — idempotenciu aj balance rieši RPC pod FOR UPDATE. Tabuľka
    // kódov zostáva, claim-first poradie sa nemení.
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

  it("claims code before granting purchased credits", async () => {
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

    expect(mockUpdate).toHaveBeenCalledWith({
      redeemed_by_agency: "agency-1",
      redeemed_at: expect.any(String),
    });
    expect(claimChain.eq).toHaveBeenCalledWith("id", "code-row-1");
    expect(claimChain.is).toHaveBeenCalledWith("redeemed_at", null);

    expect(applyCreditPurchaseMock).toHaveBeenCalledWith({
      agencyId: "agency-1",
      amount: 47,
      reason: "starter_pack_redeem",
      idempotencyKey: "starter_pack_redeem:code-row-1:agency-1",
      ref: "REV-47-ABC123",
    });
  });

  it("rejects when another agency already claimed the code (lost race)", async () => {
    claimChain = buildClaimChain({ data: null });

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
    expect(applyCreditPurchaseMock).not.toHaveBeenCalled();
  });

  it("is idempotent when same agency redeems again (RPC reports skipped)", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "code-row-2",
        code: "REV-47-DUP999",
        value: 47,
        redeemed_by_agency: "agency-1",
        redeemed_at: "2026-06-01T00:00:00Z",
      },
    });
    applyCreditPurchaseMock.mockResolvedValueOnce({ ok: true, credited: 0, skipped: true });

    const result = await redeemStarterPackCode({
      code: "REV-47-DUP999",
      agencyId: "agency-1",
    });

    expect(result).toEqual({
      ok: true,
      creditsGranted: 47,
      alreadyRedeemed: true,
    });
  });

  it("retries credit grant when code is claimed by us but credits are missing", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "code-row-4",
        code: "REV-47-RETRY1",
        value: 47,
        redeemed_by_agency: "agency-1",
        redeemed_at: "2026-08-12T00:00:00Z",
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
    expect(applyCreditPurchaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "starter_pack_redeem:code-row-4:agency-1",
      }),
    );
  });

  it("surfaces a missing agency from the RPC", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "code-row-5",
        code: "REV-47-NOAG01",
        value: 47,
        redeemed_by_agency: "agency-1",
        redeemed_at: "2026-08-12T00:00:00Z",
      },
    });
    applyCreditPurchaseMock.mockResolvedValueOnce({ ok: false, error: "agency_not_found" });

    const result = await redeemStarterPackCode({
      code: "REV-47-NOAG01",
      agencyId: "agency-1",
    });

    expect(result).toEqual({ ok: false, error: "agency_not_found" });
  });

  it("reports grant_failed on any other RPC failure", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "code-row-6",
        code: "REV-47-FAIL01",
        value: 47,
        redeemed_by_agency: "agency-1",
        redeemed_at: "2026-08-12T00:00:00Z",
      },
    });
    applyCreditPurchaseMock.mockResolvedValueOnce({ ok: false, error: "invalid_amount" });

    const result = await redeemStarterPackCode({
      code: "REV-47-FAIL01",
      agencyId: "agency-1",
    });

    expect(result).toEqual({ ok: false, error: "grant_failed" });
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
    expect(applyCreditPurchaseMock).not.toHaveBeenCalled();
  });
});
