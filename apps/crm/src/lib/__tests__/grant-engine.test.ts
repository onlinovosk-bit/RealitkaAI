import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const applyMonthlyGrantCreditsMock = vi.fn();
const expireGrantCreditsAtomicMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    from: mockFrom,
  }),
}));

vi.mock("@/lib/credits/mutate-credits", () => ({
  applyMonthlyGrantCredits: (...args: unknown[]) => applyMonthlyGrantCreditsMock(...args),
  expireGrantCreditsAtomic: (...args: unknown[]) => expireGrantCreditsAtomicMock(...args),
}));

import {
  currentPeriodKey,
  previewMonthlyGrant,
  cockpitGrantAmount,
  seatGrantPerSeat,
  grantMonthlyCreditsForAgency,
  expireGrantCreditsForAgency,
  monthlyGrantAmountForAgency,
  type AgencyCreditRow,
} from "@/lib/credits/grant-engine";
import {
  grantExpiryIdempotencyKey,
  monthlyGrantIdempotencyKey,
} from "@/lib/credits/grant-idempotency";

function agency(overrides: Partial<AgencyCreditRow> = {}): AgencyCreditRow {
  return {
    id: "agency-1",
    seats: 4,
    account_tier: "pro",
    grant_credits_balance: 50,
    purchased_credits_balance: 100,
    owner_cockpit_active: false,
    credits_balance: 150,
    ...overrides,
  };
}

describe("grant-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ledger reads zostávajú priame — expirácia sa pred zápisom pýta, či už
    // expiry riadok existuje a či nebol pridelený grant aktuálneho obdobia.
    // Samotné zápisy idú cez atomické RPC, preto tu nie je insert mock.
    mockFrom.mockImplementation((table: string) => {
      if (table === "credit_ledger") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: mockMaybeSingle }),
          }),
        };
      }
      if (table === "agencies") {
        return {
          update: (payload: unknown) => ({
            eq: () => {
              mockUpdate(payload);
              return { error: null };
            },
          }),
        };
      }
      return {};
    });
    mockMaybeSingle.mockResolvedValue({ data: null });
    applyMonthlyGrantCreditsMock.mockResolvedValue({ ok: true, granted: 100, skipped: false });
    expireGrantCreditsAtomicMock.mockResolvedValue({ ok: true, expired: 40, skipped: false });
  });

  it("currentPeriodKey formats YYYYMM", () => {
    expect(currentPeriodKey(new Date("2026-06-15T12:00:00Z"))).toBe("202606");
  });

  it("previewMonthlyGrant sums seats and cockpit", () => {
    expect(previewMonthlyGrant("team", 4, false)).toBe(4 * 25);
    expect(previewMonthlyGrant("team", 4, true)).toBe(4 * 25 + 100);
  });

  it("exports grant constants", () => {
    expect(seatGrantPerSeat("solo")).toBe(30);
    expect(cockpitGrantAmount()).toBe(100);
  });

  it("monthlyGrantIdempotencyKey is agency+YYYYMM", () => {
    expect(monthlyGrantIdempotencyKey("a1", "202606")).toBe("grant:a1:202606");
    expect(grantExpiryIdempotencyKey("a1", "202605")).toBe(
      "grant_expiry:a1:202605",
    );
  });

  it("grantMonthlyCreditsForAgency skips when the RPC reports skipped", async () => {
    applyMonthlyGrantCreditsMock.mockResolvedValueOnce({ ok: true, granted: 0, skipped: true });

    const result = await grantMonthlyCreditsForAgency(agency(), "202606");

    expect(result).toEqual({ granted: 0, skipped: true });
    expect(applyMonthlyGrantCreditsMock).toHaveBeenCalledWith({
      agencyId: "agency-1",
      amount: 100,
      periodKey: "202606",
      idempotencyKey: "grant:agency-1:202606",
    });
  });

  it("grantMonthlyCreditsForAgency reports the amount the RPC actually granted", async () => {
    applyMonthlyGrantCreditsMock.mockResolvedValueOnce({ ok: true, granted: 100, skipped: false });

    const result = await grantMonthlyCreditsForAgency(
      agency({ grant_credits_balance: 10, purchased_credits_balance: 200 }),
      "202606",
    );

    expect(result).toEqual({ granted: 100, skipped: false });
    // Žiadny absolútny balance sa neposiela — to bola presne tá stratená
    // aktualizácia. RPC si prečíta balance pod FOR UPDATE.
    expect(applyMonthlyGrantCreditsMock).toHaveBeenCalledWith({
      agencyId: "agency-1",
      amount: 100,
      periodKey: "202606",
      idempotencyKey: "grant:agency-1:202606",
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("grantMonthlyCreditsForAgency treats an RPC failure as a skip", async () => {
    applyMonthlyGrantCreditsMock.mockResolvedValueOnce({ ok: false, error: "agency_not_found" });

    const result = await grantMonthlyCreditsForAgency(agency(), "202606");

    expect(result).toEqual({ granted: 0, skipped: true });
  });

  it("expireGrantCreditsForAgency expires through the RPC without a stale balance", async () => {
    // 1) no prior expiry ledger  2) no current-period grant
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null });

    const result = await expireGrantCreditsForAgency(
      agency({
        grant_credits_balance: 40,
        purchased_credits_balance: 80,
        credits_balance: 120,
      }),
      "202605",
      new Date("2026-06-01T12:00:00Z"),
    );

    expect(result).toEqual({ expired: 40, skipped: false });
    expect(expireGrantCreditsAtomicMock).toHaveBeenCalledWith({
      agencyId: "agency-1",
      periodKey: "202605",
      idempotencyKey: "grant_expiry:agency-1:202605",
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("expireGrantCreditsForAgency reports what the RPC expired, not the snapshot", async () => {
    // Snapshot hovorí 40, ale pod zámkom už bolo 65 (medzitým prišiel grant).
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null });
    expireGrantCreditsAtomicMock.mockResolvedValueOnce({ ok: true, expired: 65, skipped: false });

    const result = await expireGrantCreditsForAgency(
      agency({ grant_credits_balance: 40 }),
      "202605",
      new Date("2026-06-01T12:00:00Z"),
    );

    expect(result).toEqual({ expired: 65, skipped: false });
  });

  it("expireGrantCreditsForAgency is idempotent when balance already cleared", async () => {
    const result = await expireGrantCreditsForAgency(
      agency({ grant_credits_balance: 0, credits_balance: 100 }),
      "202605",
      new Date("2026-06-01T12:00:00Z"),
    );

    expect(result).toEqual({ expired: 0, skipped: true });
    expect(expireGrantCreditsAtomicMock).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("expire repairs uncleared balance when expiry ledger exists and no current grant", async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { id: "expiry-done" } })
      .mockResolvedValueOnce({ data: null });

    const result = await expireGrantCreditsForAgency(
      agency({
        grant_credits_balance: 40,
        purchased_credits_balance: 80,
        credits_balance: 120,
      }),
      "202605",
      new Date("2026-06-01T12:00:00Z"),
    );

    expect(result).toEqual({ expired: 40, skipped: false });
    // Repair nemôže ísť cez RPC — ten by na existujúci idempotency key povedal
    // "skipped" a balance by zostal nevyčistený.
    expect(expireGrantCreditsAtomicMock).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        grant_credits_balance: 0,
        credits_balance: 80,
      }),
    );
  });

  it("expire refuses to wipe when current-period grant already exists", async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null }) // no prior expiry
      .mockResolvedValueOnce({ data: { id: "grant-row" } }); // current grant present

    const result = await expireGrantCreditsForAgency(
      agency({
        grant_credits_balance: 140,
        purchased_credits_balance: 80,
        credits_balance: 220,
      }),
      "202605",
      new Date("2026-06-01T12:00:00Z"),
    );

    expect(result).toEqual({ expired: 0, skipped: true });
    expect(expireGrantCreditsAtomicMock).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("expire surfaces an RPC failure as error (not a silent skip)", async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null });
    expireGrantCreditsAtomicMock.mockResolvedValueOnce({
      ok: false,
      error: "agency_not_found",
    });

    const result = await expireGrantCreditsForAgency(
      agency(),
      "202605",
      new Date("2026-06-01T12:00:00Z"),
    );

    expect(result).toEqual({
      expired: 0,
      skipped: true,
      error: "agency_not_found",
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("expire surfaces a ledger lookup failure as error", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: { message: "lookup down" } });

    const result = await expireGrantCreditsForAgency(
      agency(),
      "202605",
      new Date("2026-06-01T12:00:00Z"),
    );

    expect(result).toEqual({ expired: 0, skipped: true, error: "lookup down" });
    expect(expireGrantCreditsAtomicMock).not.toHaveBeenCalled();
  });

  describe("pricing v2 (kritériá 6, 7)", () => {
    const v2 = (overrides: Partial<AgencyCreditRow> = {}): AgencyCreditRow =>
      agency({
        seats: 10,
        account_tier: "enterprise",
        pricing_model: "v2",
        pricing_band: "office",
        pack_credits: 60,
        subscription_status: "active",
        ...overrides,
      });

    it("v2 grant = band credits + pack_credits, NOT seats x rate", () => {
      // office 100 + 60 balík; legacy výpočet by dal 10 seatov x sadzba.
      expect(monthlyGrantAmountForAgency(v2())).toBe(160);
      expect(monthlyGrantAmountForAgency(v2({ seats: 500 }))).toBe(160);
      expect(monthlyGrantAmountForAgency(v2({ pricing_band: "start", pack_credits: 0 }))).toBe(20);
      expect(monthlyGrantAmountForAgency(v2({ pricing_band: "team", pack_credits: null }))).toBe(50);
      expect(monthlyGrantAmountForAgency(v2({ pricing_band: "network", pack_credits: 300 }))).toBe(450);
      expect(monthlyGrantAmountForAgency(v2())).not.toBe(
        previewMonthlyGrant("office", 10, false),
      );
    });

    it("v2 grants only while subscription_status is 'active'", () => {
      for (const status of ["past_due", "unpaid", "canceled", "trialing", "incomplete", null, undefined, ""]) {
        expect(monthlyGrantAmountForAgency(v2({ subscription_status: status as never }))).toBe(0);
      }
    });

    it("v2 fails closed on an unknown band, bad pack or unknown pricing model (never falls back to legacy)", () => {
      expect(monthlyGrantAmountForAgency(v2({ pricing_band: "mega" }))).toBe(0);
      expect(monthlyGrantAmountForAgency(v2({ pricing_band: null }))).toBe(0);
      expect(monthlyGrantAmountForAgency(v2({ pack_credits: -5 }))).toBe(0);
      expect(monthlyGrantAmountForAgency(v2({ pack_credits: 1.5 }))).toBe(0);
      expect(monthlyGrantAmountForAgency(v2({ pricing_model: "v3" }))).toBe(0);
    });

    it("legacy agency gets exactly the grant it got before (v2 fields absent or NULL)", () => {
      const cases: AgencyCreditRow[] = [
        agency(),
        agency({ seats: 1, account_tier: "starter" }),
        agency({ seats: 12, account_tier: "enterprise", owner_cockpit_active: true }),
        agency({ seats: 3, account_tier: "weird_unknown_tier" }),
        agency({ seats: 0 }),
      ];
      const legacyExpected = [
        previewMonthlyGrant("team", 4, false),
        previewMonthlyGrant("solo", 1, false),
        previewMonthlyGrant("office", 12, true),
        previewMonthlyGrant("team", 3, false),
        0,
      ];
      cases.forEach((row, i) => {
        expect(monthlyGrantAmountForAgency(row)).toBe(legacyExpected[i]);
        // explicitné NULL polia z DB (po migrácii) sa správajú rovnako
        expect(
          monthlyGrantAmountForAgency({ ...row, pricing_model: null, pricing_band: null, pack_credits: 0, subscription_status: null }),
        ).toBe(legacyExpected[i]);
      });
    });

    it("legacy agency keeps being granted whatever its subscription_status (unchanged behaviour)", () => {
      expect(monthlyGrantAmountForAgency(agency({ subscription_status: "canceled" }))).toBe(previewMonthlyGrant("team", 4, false));
    });

    it("grantMonthlyCreditsForAgency sends the v2 amount to the idempotent RPC", async () => {
      applyMonthlyGrantCreditsMock.mockResolvedValue({ ok: true, granted: 160, skipped: false });
      const result = await grantMonthlyCreditsForAgency(v2(), "202610");
      expect(result).toEqual({ granted: 160, skipped: false });
      expect(applyMonthlyGrantCreditsMock).toHaveBeenCalledWith({
        agencyId: "agency-1",
        amount: 160,
        periodKey: "202610",
        idempotencyKey: monthlyGrantIdempotencyKey("agency-1", "202610"),
      });
    });

    it("a v2 agency that is not active is skipped without calling the RPC", async () => {
      const result = await grantMonthlyCreditsForAgency(v2({ subscription_status: "past_due" }), "202610");
      expect(result).toEqual({ granted: 0, skipped: true });
      expect(applyMonthlyGrantCreditsMock).not.toHaveBeenCalled();
    });

    it("expiry of the grant pool is the same as for legacy (distinct from purchased credits)", async () => {
      const result = await expireGrantCreditsForAgency(v2({ grant_credits_balance: 40 }), "202609", new Date("2026-10-01T12:00:00Z"));
      expect(result).toEqual({ expired: 40, skipped: false });
      expect(expireGrantCreditsAtomicMock).toHaveBeenCalledWith({
        agencyId: "agency-1",
        periodKey: "202609",
        idempotencyKey: grantExpiryIdempotencyKey("agency-1", "202609"),
      });
    });
  });
});
