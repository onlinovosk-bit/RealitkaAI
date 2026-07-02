import { describe, it, expect, vi, beforeEach } from "vitest";
import { fulfillStarterPackPurchase } from "@/lib/starter-pack/fulfillment";
import { generateStarterPackRedemptionCode } from "@/lib/starter-pack/code-generator";

const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    from: mockFrom,
  }),
}));

vi.mock("@/lib/starter-pack/code-generator", () => ({
  generateStarterPackRedemptionCode: vi.fn(() => "REV-47-TEST01"),
}));

vi.mock("@/lib/starter-pack/download-token", () => ({
  starterPackDownloadUrl: (sessionId: string) =>
    `https://app.test/api/starter-pack/download?s=${sessionId}`,
  starterPackProductLabel: () => "Maklérsky štartovací balík",
}));

describe("starter pack webhook fulfillment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;
    process.env.RESEND_API_KEY = "";

    mockFrom.mockImplementation((table: string) => {
      if (table === "credit_redemption_codes") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: mockMaybeSingle }),
          }),
          insert: mockInsert,
        };
      }
      return {};
    });

    mockInsert.mockResolvedValue({ error: null });
  });

  it("generates code and inserts row on first fulfillment", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });

    const result = await fulfillStarterPackPurchase({
      stripeSessionId: "cs_test_123",
      customerEmail: "makler@test.sk",
    });

    expect(result).toEqual({
      code: "REV-47-TEST01",
      downloadUrl: "https://app.test/api/starter-pack/download?s=cs_test_123",
      skipped: false,
    });
    expect(generateStarterPackRedemptionCode).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "REV-47-TEST01",
        value: 47,
        stripe_session_id: "cs_test_123",
        purchaser_email: "makler@test.sk",
      }),
    );
  });

  it("is idempotent when code already exists for session", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { code: "REV-47-EXIST1" } });

    const result = await fulfillStarterPackPurchase({
      stripeSessionId: "cs_test_dup",
      customerEmail: "makler@test.sk",
    });

    expect(result?.skipped).toBe(true);
    expect(result?.code).toBe("REV-47-EXIST1");
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
