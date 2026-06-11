import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildSeatCheckoutSessionParams,
  applySeatCheckoutEntitlements,
  applyTopupPurchase,
  parseCheckoutBody,
} from "@/lib/credits-billing";
import { handlePricingCheckoutWebhook } from "@/lib/credits-billing-webhook";

const mockFrom = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    from: mockFrom,
  }),
}));

vi.mock("@/lib/credits/grant-engine", () => ({
  currentPeriodKey: () => "202606",
  grantMonthlyCreditsForAgency: vi.fn().mockResolvedValue({ granted: 100, skipped: false }),
}));

describe("credits-billing", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...envBackup,
      STRIPE_PRICE_SOLO_SEAT: "price_solo",
      STRIPE_PRICE_TEAM_SEAT: "price_team",
      STRIPE_PRICE_OFFICE_SEAT: "price_office",
      STRIPE_PRICE_OWNER_COCKPIT: "price_cockpit",
      STRIPE_PRICE_OWNER_COCKPIT_FOUNDER: "price_cockpit_founder",
      STRIPE_PRICE_CREDITS_RAST: "price_rast",
    };

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
          select: () => ({
            eq: () => ({ single: mockSingle }),
          }),
          update: (payload: unknown) => ({
            eq: (...args: unknown[]) => {
              mockUpdate(payload, ...args);
              return { error: null };
            },
          }),
        };
      }
      if (table === "profiles") {
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
    mockSingle.mockResolvedValue({
      data: {
        purchased_credits_balance: 0,
        grant_credits_balance: 50,
        credits_balance: 50,
      },
    });
    mockInsert.mockResolvedValue({ error: null });
  });

  describe("buildSeatCheckoutSessionParams", () => {
    it("builds seat line item with min quantity", () => {
      const result = buildSeatCheckoutSessionParams({
        seatTier: "team",
        quantity: 1,
        includeOwnerCockpit: false,
      });

      expect(result.quantity).toBe(3);
      expect(result.lineItems).toEqual([{ price: "price_team", quantity: 3 }]);
      expect(result.metadata.seatTier).toBe("team");
      expect(result.metadata.ownerCockpit).toBe("false");
    });

    it("adds cockpit line item at 3+ seats with founder metadata", () => {
      const result = buildSeatCheckoutSessionParams({
        seatTier: "team",
        quantity: 5,
        includeOwnerCockpit: true,
      });

      expect(result.lineItems).toHaveLength(2);
      expect(result.lineItems[1]).toEqual({ price: "price_cockpit_founder", quantity: 1 });
      expect(result.metadata.ownerCockpit).toBe("true");
      expect(result.metadata.founderCockpit).toBe("true");
    });
  });

  describe("parseCheckoutBody", () => {
    it("parses seat and topup payloads", () => {
      expect(
        parseCheckoutBody({
          checkoutType: "seat",
          seatTier: "solo",
          quantity: 2,
          cockpit: true,
        }),
      ).toMatchObject({ type: "seat", seatTier: "solo", includeOwnerCockpit: true });

      expect(
        parseCheckoutBody({ checkoutType: "topup", topupPackage: "mega" }),
      ).toMatchObject({ type: "topup", topupPackage: "mega" });
    });
  });

  describe("applySeatCheckoutEntitlements", () => {
    it("writes agency tier, seats, and cockpit", async () => {
      const ok = await applySeatCheckoutEntitlements({
        agencyId: "agency-1",
        authUserId: "user-1",
        seatTier: "team",
        seatQuantity: 4,
        ownerCockpit: true,
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
      });

      expect(ok).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          seats: 4,
          account_tier: "pro",
          owner_cockpit_active: true,
          cockpit_tier: "owner",
          stripe_customer_id: "cus_1",
          stripe_subscription_id: "sub_1",
        }),
        "id",
        "agency-1",
      );
    });
  });

  describe("applyTopupPurchase", () => {
    it("writes purchase ledger idempotently", async () => {
      const first = await applyTopupPurchase({
        agencyId: "agency-1",
        packageKey: "rast",
        stripeSessionId: "cs_test_1",
      });

      expect(first).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          agency_id: "agency-1",
          delta: 150,
          source: "purchase",
          idempotency_key: "purchase:agency-1:cs_test_1",
        }),
      );

      mockMaybeSingle.mockResolvedValueOnce({ data: { id: "existing" } });
      mockInsert.mockClear();

      const second = await applyTopupPurchase({
        agencyId: "agency-1",
        packageKey: "rast",
        stripeSessionId: "cs_test_1",
      });

      expect(second).toBe(true);
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe("handlePricingCheckoutWebhook", () => {
    it("handles seat checkout and triggers grant path", async () => {
      const handled = await handlePricingCheckoutWebhook({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_seat_1",
            customer: "cus_1",
            subscription: "sub_1",
            metadata: {
              checkoutType: "seat",
              agencyId: "agency-1",
              authUserId: "user-1",
              seatTier: "team",
              seatQuantity: "5",
              ownerCockpit: "true",
            },
          },
        },
      } as never);

      expect(handled).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("handles credit topup checkout", async () => {
      const handled = await handlePricingCheckoutWebhook({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_topup_1",
            metadata: {
              checkoutType: "credit_topup",
              agencyId: "agency-1",
              topupPackage: "rast",
            },
          },
        },
      } as never);

      expect(handled).toBe(true);
      expect(mockInsert).toHaveBeenCalled();
    });

    it("ignores legacy checkout events", async () => {
      const handled = await handlePricingCheckoutWebhook({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_legacy",
            metadata: { planKey: "starter" },
          },
        },
      } as never);

      expect(handled).toBe(false);
    });
  });
});
