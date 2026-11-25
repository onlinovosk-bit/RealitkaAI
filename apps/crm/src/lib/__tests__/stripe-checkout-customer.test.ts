import { describe, expect, it } from "vitest";
import { stripeCheckoutCustomerBinding } from "@/lib/stripe-checkout-customer";

describe("stripeCheckoutCustomerBinding", () => {
  it("reuses stored Stripe customer id (no customer_email)", () => {
    expect(
      stripeCheckoutCustomerBinding({
        stripeCustomerId: "cus_live",
        email: "broker@example.test",
      }),
    ).toEqual({ customer: "cus_live" });
  });

  it("falls back to customer_email when agency has no customer id", () => {
    expect(
      stripeCheckoutCustomerBinding({
        stripeCustomerId: null,
        email: "broker@example.test",
      }),
    ).toEqual({ customer_email: "broker@example.test" });
    expect(
      stripeCheckoutCustomerBinding({
        stripeCustomerId: "   ",
        email: "broker@example.test",
      }),
    ).toEqual({ customer_email: "broker@example.test" });
  });
});
