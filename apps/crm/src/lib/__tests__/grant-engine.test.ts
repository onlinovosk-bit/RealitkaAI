import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  currentPeriodKey,
  previewMonthlyGrant,
  cockpitGrantAmount,
  seatGrantPerSeat,
  grantMonthlyCreditsForAgency,
  expireGrantCreditsForAgency,
  type AgencyCreditRow,
} from "@/lib/credits/grant-engine";
import {
  grantExpiryIdempotencyKey,
  monthlyGrantIdempotencyKey,
} from "@/lib/credits/grant-idempotency";

const mockFrom = vi.fn();
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    from: mockFrom,
  }),
}));

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
    mockFrom.mockImplementation((table: string) => {
      if (table === "credit_ledger") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: mockMaybeSingle }),
          }),
          insert: mockInsert,
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
    mockInsert.mockResolvedValue({ error: null });
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

  it("grantMonthlyCreditsForAgency skips when idempotency row exists", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: "existing" } });

    const result = await grantMonthlyCreditsForAgency(agency(), "202606");

    expect(result).toEqual({ granted: 0, skipped: true });
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("grantMonthlyCreditsForAgency credits grant pool only", async () => {
    const row = agency({
      grant_credits_balance: 10,
      purchased_credits_balance: 200,
    });

    const result = await grantMonthlyCreditsForAgency(row, "202606");

    expect(result.skipped).toBe(false);
    expect(result.granted).toBe(100);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        agency_id: "agency-1",
        source: "grant",
        idempotency_key: "grant:agency-1:202606",
      }),
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        grant_credits_balance: 110,
        credits_balance: 310,
      }),
    );
  });

  it("expireGrantCreditsForAgency does not touch purchased balance", async () => {
    const row = agency({
      grant_credits_balance: 40,
      purchased_credits_balance: 80,
      credits_balance: 120,
    });

    const result = await expireGrantCreditsForAgency(row, "202605");

    expect(result).toEqual({ expired: 40, skipped: false });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        grant_credits_balance: 0,
        credits_balance: 80,
      }),
    );
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        delta: -40,
        reason: "grant_expiry",
        source: "grant",
      }),
    );
  });

  it("expireGrantCreditsForAgency is idempotent", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: "done" } });

    const result = await expireGrantCreditsForAgency(agency(), "202605");

    expect(result).toEqual({ expired: 0, skipped: true });
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
