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
});
