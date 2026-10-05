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

describe("runMonthlyCreditCycle — pricing v2 (kritérium 6)", () => {
  const v2Agency = {
    id: "agency-v2",
    seats: 4,
    account_tier: "pro",
    grant_credits_balance: 0,
    purchased_credits_balance: 0,
    owner_cockpit_active: false,
    credits_balance: 0,
    pricing_model: "v2",
    pricing_band: "team",
    pack_credits: 120,
    subscription_status: "active",
  };

  /** Zaznamená stĺpce každého selectu a vráti riadky podľa `rows` / chyby podľa `errors`. */
  function wireDb(opts: { rows: unknown[]; grantErrors?: Array<{ code?: string; message: string } | null> }) {
    const selects: string[] = [];
    const grantErrors = [...(opts.grantErrors ?? [])];
    mockFrom.mockImplementation(() => ({
      select: (cols: string) => {
        selects.push(cols);
        return {
          gt: (col: string) => {
            if (col === "grant_credits_balance") return Promise.resolve({ data: [], error: null });
            const error = grantErrors.length ? grantErrors.shift()! : null;
            return Promise.resolve({ data: error ? null : opts.rows, error });
          },
        };
      },
    }));
    return selects;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    expireMock.mockResolvedValue({ expired: 0, skipped: true });
    grantMock.mockResolvedValue({ granted: 180, skipped: false });
  });

  it("the grant phase selects the v2 columns and hands the v2 agency (seats > 0) to the grant engine", async () => {
    const selects = wireDb({ rows: [v2Agency] });
    const result = await runMonthlyCreditCycle();

    expect(result.ok).toBe(true);
    const grantSelect = selects[1];
    for (const col of ["pricing_model", "pricing_band", "pack_credits", "subscription_status"]) {
      expect(grantSelect).toContain(col);
    }
    // expirácia (fáza 1) ostáva na pôvodných stĺpcoch
    expect(selects[0]).not.toContain("pricing_model");
    expect(grantMock).toHaveBeenCalledTimes(1);
    expect(grantMock.mock.calls[0][0]).toMatchObject({ id: "agency-v2", pricing_model: "v2", pricing_band: "team", pack_credits: 120 });
  });

  it("before the migration is applied the cycle falls back to the legacy columns instead of failing", async () => {
    const selects = wireDb({
      rows: [agencyA],
      grantErrors: [{ code: "42703", message: 'column agencies.pricing_model does not exist' }],
    });
    const result = await runMonthlyCreditCycle();

    expect(result.ok).toBe(true);
    expect(selects).toHaveLength(3);
    expect(selects[2]).not.toContain("pricing_model");
    expect(grantMock).toHaveBeenCalledTimes(1);
  });

  it("any other grant-phase DB error still fails the cycle (no blanket fallback)", async () => {
    wireDb({ rows: [agencyA], grantErrors: [{ code: "XX000", message: "connection reset" }] });
    const result = await runMonthlyCreditCycle();
    expect(result.ok).toBe(false);
    expect(result.error).toBe("connection reset");
    expect(grantMock).not.toHaveBeenCalled();
  });
});
