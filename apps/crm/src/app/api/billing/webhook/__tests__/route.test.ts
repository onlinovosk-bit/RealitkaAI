import { beforeEach, describe, expect, it, vi } from "vitest";

const mockVerify = vi.fn();
const mockPricing = vi.fn();
const mockLegacy = vi.fn();

vi.mock("@/lib/billing-store", () => ({
  verifyStripeWebhook: (...args: unknown[]) => mockVerify(...args),
  handleStripeWebhookEvent: (...args: unknown[]) => mockLegacy(...args),
}));

vi.mock("@/lib/credits-billing-webhook", () => ({
  handlePricingCheckoutWebhook: (...args: unknown[]) => mockPricing(...args),
}));

vi.mock("@/lib/auto-error-capture", () => ({
  autoErrorCapture: (error: unknown) => ({
    error: error instanceof Error ? error.message : "error",
  }),
}));

describe("POST /api/billing/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerify.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          metadata: {
            checkoutType: "credit_topup",
            agencyId: "agency-1",
            topupPackage: "rast",
          },
        },
      },
    });
    mockPricing.mockResolvedValue(true);
    mockLegacy.mockResolvedValue(undefined);
  });

  it("returns 500 when pricing top-up fulfillment fails (no Stripe ACK)", async () => {
    mockPricing.mockResolvedValueOnce(false);
    const { POST } = await import("@/app/api/billing/webhook/route");

    const res = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: { "stripe-signature": "sig_test" },
        body: "{}",
      }),
    );

    expect(res.status).toBe(500);
    expect(mockLegacy).not.toHaveBeenCalled();
  });

  it("ACKs when pricing fulfillment succeeds", async () => {
    const { POST } = await import("@/app/api/billing/webhook/route");

    const res = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: { "stripe-signature": "sig_test" },
        body: "{}",
      }),
    );

    expect(res.status).toBe(200);
    expect(mockLegacy).toHaveBeenCalled();
  });

  it("still ACKs non-pricing events even if pricing handler returns false", async () => {
    mockVerify.mockReturnValueOnce({
      id: "evt_legacy",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_legacy",
          metadata: { planKey: "pro", authUserId: "user-1" },
        },
      },
    });
    mockPricing.mockResolvedValueOnce(false);

    const { POST } = await import("@/app/api/billing/webhook/route");
    const res = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: { "stripe-signature": "sig_test" },
        body: "{}",
      }),
    );

    expect(res.status).toBe(200);
    expect(mockLegacy).toHaveBeenCalled();
  });

  describe("cenník v2", () => {
    function v2Event(type: string, checkoutType: string) {
      return {
        id: "evt_v2",
        type,
        data: { object: { id: "cs_v2", metadata: { checkoutType, agencyId: "agency-1" } } },
      };
    }
    const request = () =>
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: { "stripe-signature": "sig_test" },
        body: "{}",
      });

    it.each(["pricing_v2", "pricing_v2_credits"])("%s: failed fulfillment -> 500, never a silent ACK", async (checkoutType) => {
      mockVerify.mockReturnValueOnce(v2Event("checkout.session.completed", checkoutType));
      mockPricing.mockResolvedValueOnce(false);
      const { POST } = await import("@/app/api/billing/webhook/route");
      const res = await POST(request());
      expect(res.status).toBe(500);
      expect(mockLegacy).not.toHaveBeenCalled();
    });

    it.each(["pricing_v2", "pricing_v2_credits"])("%s: successful fulfillment -> 200", async (checkoutType) => {
      mockVerify.mockReturnValueOnce(v2Event("checkout.session.completed", checkoutType));
      const { POST } = await import("@/app/api/billing/webhook/route");
      expect((await POST(request())).status).toBe(200);
      expect(mockPricing).toHaveBeenCalledTimes(1);
    });

    it("async_payment_succeeded for v2 is also guarded (failure -> 500)", async () => {
      mockVerify.mockReturnValueOnce(v2Event("checkout.session.async_payment_succeeded", "pricing_v2"));
      mockPricing.mockResolvedValueOnce(false);
      const { POST } = await import("@/app/api/billing/webhook/route");
      expect((await POST(request())).status).toBe(500);
    });

    it("async_payment_succeeded for a legacy type keeps today's behaviour (not guarded)", async () => {
      mockVerify.mockReturnValueOnce(v2Event("checkout.session.async_payment_succeeded", "seat"));
      mockPricing.mockResolvedValueOnce(false);
      const { POST } = await import("@/app/api/billing/webhook/route");
      expect((await POST(request())).status).toBe(200);
    });

    it("legacy top-up failure is still a 500 whatever the PRICING_V2_ENABLED value (kritérium 1)", async () => {
      for (const flag of [undefined, "", "true"]) {
        vi.unstubAllEnvs();
        if (flag !== undefined) vi.stubEnv("PRICING_V2_ENABLED", flag);
        mockPricing.mockResolvedValueOnce(false);
        const { POST } = await import("@/app/api/billing/webhook/route");
        expect((await POST(request())).status).toBe(500);
      }
      vi.unstubAllEnvs();
    });

    it("a thrown v2 subscription sync (legacy handler throws) is not ACKed with 200", async () => {
      mockLegacy.mockRejectedValueOnce(new Error("v2 sync failed"));
      const { POST } = await import("@/app/api/billing/webhook/route");
      expect((await POST(request())).status).toBe(400);
    });
  });
});
