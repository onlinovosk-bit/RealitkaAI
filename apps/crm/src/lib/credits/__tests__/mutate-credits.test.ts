import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRpc = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    rpc: mockRpc,
  }),
}));

import {
  applyCreditPurchase,
  applyMonthlyGrantCredits,
  expireGrantCreditsAtomic,
} from "@/lib/credits/mutate-credits";

describe("mutate-credits RPC wrappers", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("applyCreditPurchase maps credited + skipped", async () => {
    mockRpc.mockResolvedValue({ data: { ok: true, credited: 150, skipped: false }, error: null });

    const r = await applyCreditPurchase({
      agencyId: "agency-1",
      amount: 150,
      reason: "credit_topup",
      idempotencyKey: "purchase:agency-1:cs_1",
      ref: "rast",
    });

    expect(mockRpc).toHaveBeenCalledWith(
      "apply_credit_purchase",
      expect.objectContaining({
        p_agency_id: "agency-1",
        p_amount: 150,
        p_idempotency_key: "purchase:agency-1:cs_1",
      }),
    );
    expect(r).toEqual({ ok: true, credited: 150, skipped: false, error: undefined });
  });

  it("applyMonthlyGrantCredits maps granted", async () => {
    mockRpc.mockResolvedValue({ data: { ok: true, granted: 100, skipped: false }, error: null });

    const r = await applyMonthlyGrantCredits({
      agencyId: "agency-1",
      amount: 100,
      periodKey: "202608",
      idempotencyKey: "grant:agency-1:202608",
    });

    expect(r).toMatchObject({ ok: true, granted: 100, skipped: false });
  });

  it("expireGrantCreditsAtomic maps expired", async () => {
    mockRpc.mockResolvedValue({ data: { ok: true, expired: 40, skipped: false }, error: null });

    const r = await expireGrantCreditsAtomic({
      agencyId: "agency-1",
      periodKey: "202607",
      idempotencyKey: "grant_expiry:agency-1:202607",
    });

    expect(r).toMatchObject({ ok: true, expired: 40, skipped: false });
  });

  it("surfaces RPC transport errors", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "function missing" } });

    const r = await applyCreditPurchase({
      agencyId: "a",
      amount: 10,
      reason: "credit_topup",
      idempotencyKey: "k",
    });

    expect(r).toEqual({ ok: false, error: "function missing" });
  });
});
