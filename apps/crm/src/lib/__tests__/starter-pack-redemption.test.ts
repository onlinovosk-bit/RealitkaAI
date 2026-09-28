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

/**
 * Po #370 už redemption nesiaha na `credit_ledger` ani `agencies` — pripísanie
 * robí RPC `apply_credit_purchase` a idempotencia je jeho, nie kontrola ledgeru
 * pred zápisom. Preto sa tu mockuje iba `credit_redemption_codes`; keby kód
 * siahol inam, `mockFrom` vráti `{}` a test spadne na chýbajúcej metóde.
 */
describe("starter pack code redemption", () => {
  let claimChain: ReturnType<typeof buildClaimChain>;

  function wireTables() {
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
  }

  beforeEach(() => {
    vi.clearAllMocks();
    claimChain = buildClaimChain({ data: { id: "code-row-1" } });
    wireTables();
    applyCreditPurchaseMock.mockResolvedValue({ ok: true, credited: 47, skipped: false });
  });

  it("claims the code first, then grants credits via the atomic RPC", async () => {
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

    // Claim prebehol podmienene — bez `.is("redeemed_at", null)` by dve agentury
    // mohli claimnut ten isty kod.
    expect(mockUpdate).toHaveBeenCalledWith({
      redeemed_by_agency: "agency-1",
      redeemed_at: expect.any(String),
    });
    expect(claimChain.eq).toHaveBeenCalledWith("id", "code-row-1");
    expect(claimChain.is).toHaveBeenCalledWith("redeemed_at", null);

    expect(applyCreditPurchaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId: "agency-1",
        amount: 47,
        reason: "starter_pack_redeem",
        idempotencyKey: "starter_pack_redeem:code-row-1:agency-1",
        ref: "REV-47-ABC123",
      }),
    );
  });

  it("rejects when another agency won the claim race", async () => {
    claimChain = buildClaimChain({ data: null });
    wireTables();

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
      // re-read po prehratom claime
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

  it("reports alreadyRedeemed when the RPC skips a repeated redemption", async () => {
    applyCreditPurchaseMock.mockResolvedValue({ ok: true, skipped: true });
    mockMaybeSingle.mockResolvedValueOnce({
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
    // Kod uz bol claimnuty nami — druhy claim sa nesmie pokusat.
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("surfaces agency_not_found from the RPC instead of a generic failure", async () => {
    applyCreditPurchaseMock.mockResolvedValue({ ok: false, error: "agency_not_found" });
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

    expect(result).toEqual({ ok: false, error: "agency_not_found" });
  });

  it("rejects a code already used by another agency without claiming", async () => {
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
    expect(applyCreditPurchaseMock).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
