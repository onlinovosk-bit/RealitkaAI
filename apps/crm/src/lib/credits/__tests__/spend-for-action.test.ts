import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const spendCreditsMock = vi.fn();
vi.mock("@/lib/credits/spend-credits", () => ({
  spendCredits: (...args: unknown[]) => spendCreditsMock(...args),
}));

import { spendForAction, creditsEnforcementEnabled } from "@/lib/credits/spend-for-action";
import { CREDIT_ACTION_COSTS } from "@/lib/program-tier-pricing";

describe("spendForAction", () => {
  const original = process.env.CREDITS_ENFORCEMENT;

  beforeEach(() => spendCreditsMock.mockReset());
  afterEach(() => {
    if (original === undefined) delete process.env.CREDITS_ENFORCEMENT;
    else process.env.CREDITS_ENFORCEMENT = original;
  });

  it("vynucovanie je predvolene vypnuté", () => {
    delete process.env.CREDITS_ENFORCEMENT;
    expect(creditsEnforcementEnabled()).toBe(false);
  });

  it("pri vypnutom vynucovaní nestrháva, ale vráti cenu a pustí akciu", async () => {
    delete process.env.CREDITS_ENFORCEMENT;
    const r = await spendForAction({
      action: "listingDescription",
      agencyId: "agency-1",
      idempotencyKey: "k1",
    });
    expect(r).toMatchObject({ allowed: true, charged: false, reason: "disabled" });
    expect(r.cost).toBe(CREDIT_ACTION_COSTS.listingDescription);
    expect(spendCreditsMock).not.toHaveBeenCalled();
  });

  it("pri zapnutom vynucovaní strhne správnu sumu zo sadzobníka", async () => {
    process.env.CREDITS_ENFORCEMENT = "enforce";
    spendCreditsMock.mockResolvedValue({ ok: true, spent: 20 });
    const r = await spendForAction({
      action: "leadUnlock",
      agencyId: "agency-1",
      idempotencyKey: "k2",
    });
    expect(r).toMatchObject({ allowed: true, charged: true });
    expect(spendCreditsMock).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: "agency-1", amount: 20, idempotencyKey: "k2" }),
    );
  });

  it("nedostatok kreditov akciu zamietne", async () => {
    process.env.CREDITS_ENFORCEMENT = "enforce";
    spendCreditsMock.mockResolvedValue({ ok: false, error: "insufficient_credits" });
    const r = await spendForAction({ action: "aiEmail", agencyId: "a", idempotencyKey: "k3" });
    expect(r).toMatchObject({ allowed: false, charged: false, reason: "insufficient" });
  });

  it("chyba billingu nesmie zablokovať produkt", async () => {
    process.env.CREDITS_ENFORCEMENT = "enforce";
    spendCreditsMock.mockResolvedValue({ ok: false, error: "boom" });
    const r = await spendForAction({ action: "aiEmail", agencyId: "a", idempotencyKey: "k4" });
    expect(r).toMatchObject({ allowed: true, charged: false, reason: "error" });
  });

  it("bez agency_id neúčtuje, ale akciu pustí", async () => {
    process.env.CREDITS_ENFORCEMENT = "enforce";
    const r = await spendForAction({ action: "aiEmail", agencyId: null, idempotencyKey: "k5" });
    expect(r).toMatchObject({ allowed: true, charged: false, reason: "no_agency" });
    expect(spendCreditsMock).not.toHaveBeenCalled();
  });

  it("idempotentné opakovanie sa nepočíta ako nové strhnutie", async () => {
    process.env.CREDITS_ENFORCEMENT = "enforce";
    spendCreditsMock.mockResolvedValue({ ok: true, skipped: true });
    const r = await spendForAction({ action: "aiEmail", agencyId: "a", idempotencyKey: "k6" });
    expect(r).toMatchObject({ allowed: true, charged: false });
  });
});
