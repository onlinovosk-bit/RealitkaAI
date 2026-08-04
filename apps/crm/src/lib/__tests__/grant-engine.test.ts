import { describe, it, expect, vi, beforeEach } from "vitest";

const applyMonthlyGrantCreditsMock = vi.fn();
const expireGrantCreditsAtomicMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({}),
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

  it("grantMonthlyCreditsForAgency skips when RPC reports skipped", async () => {
    applyMonthlyGrantCreditsMock.mockResolvedValueOnce({ ok: true, skipped: true, granted: 0 });

    const result = await grantMonthlyCreditsForAgency(agency(), "202606");

    expect(result).toEqual({ granted: 0, skipped: true });
    expect(applyMonthlyGrantCreditsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId: "agency-1",
        amount: 100,
        periodKey: "202606",
        idempotencyKey: "grant:agency-1:202606",
      }),
    );
  });

  it("grantMonthlyCreditsForAgency credits grant pool via atomic RPC", async () => {
    const row = agency({
      grant_credits_balance: 10,
      purchased_credits_balance: 200,
    });

    const result = await grantMonthlyCreditsForAgency(row, "202606");

    expect(result).toEqual({ granted: 100, skipped: false });
    expect(applyMonthlyGrantCreditsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId: "agency-1",
        amount: 100,
        idempotencyKey: "grant:agency-1:202606",
      }),
    );
  });

  it("expireGrantCreditsForAgency uses atomic RPC and does not pass stale purchased", async () => {
    const row = agency({
      grant_credits_balance: 40,
      purchased_credits_balance: 80,
      credits_balance: 120,
    });

    const result = await expireGrantCreditsForAgency(row, "202605");

    expect(result).toEqual({ expired: 40, skipped: false });
    expect(expireGrantCreditsAtomicMock).toHaveBeenCalledWith({
      agencyId: "agency-1",
      periodKey: "202605",
      idempotencyKey: "grant_expiry:agency-1:202605",
    });
  });

  it("expireGrantCreditsForAgency is idempotent when RPC skips", async () => {
    expireGrantCreditsAtomicMock.mockResolvedValueOnce({ ok: true, skipped: true, expired: 0 });

    const result = await expireGrantCreditsForAgency(agency(), "202605");

    expect(result).toEqual({ expired: 0, skipped: true });
  });

  it("expireGrantCreditsForAgency skips RPC when snapshot grant is zero", async () => {
    const result = await expireGrantCreditsForAgency(
      agency({ grant_credits_balance: 0 }),
      "202605",
    );

    expect(result).toEqual({ expired: 0, skipped: true });
    expect(expireGrantCreditsAtomicMock).not.toHaveBeenCalled();
  });
});
