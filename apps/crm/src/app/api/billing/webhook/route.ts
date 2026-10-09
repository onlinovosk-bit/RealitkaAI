import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { handleStripeWebhookEvent, verifyStripeWebhook } from "@/lib/billing-store";
import { handlePricingCheckoutWebhook } from "@/lib/credits-billing-webhook";
import { autoErrorCapture } from "@/lib/auto-error-capture";
import {
  PRICING_V2_CHECKOUT_TYPE_CREDITS,
  PRICING_V2_CHECKOUT_TYPE_PLAN,
} from "@/lib/pricing-v2-contract";
import { syncAgencyBillingLifecycle } from "@/lib/billing-lifecycle";
import { describeError } from "@/lib/log-safe";

/** Seat / top-up / starter-pack / pricing v2 — fulfilled only by handlePricingCheckoutWebhook. */
function isPricingCheckoutSession(event: Stripe.Event): boolean {
  const checkoutType = (event.data.object as Stripe.Checkout.Session).metadata?.checkoutType;
  // Cenník v2: plní aj checkout.session.async_payment_succeeded (asynchrónna platba).
  if (
    event.type === "checkout.session.async_payment_succeeded" &&
    (checkoutType === PRICING_V2_CHECKOUT_TYPE_PLAN || checkoutType === PRICING_V2_CHECKOUT_TYPE_CREDITS)
  ) {
    return true;
  }
  if (event.type !== "checkout.session.completed") return false;
  return (
    checkoutType === PRICING_V2_CHECKOUT_TYPE_PLAN ||
    checkoutType === PRICING_V2_CHECKOUT_TYPE_CREDITS ||
    checkoutType === "seat" ||
    checkoutType === "credit_topup" ||
    checkoutType === "starter_pack"
  );
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return new NextResponse("Missing stripe-signature header", { status: 400 });
    }

    const payload = await request.text();
    const event = verifyStripeWebhook(payload, signature);

    const pricingOk = await handlePricingCheckoutWebhook(event);

    // Must not ACK failed pricing fulfillment — Stripe would stop retrying and
    // the customer keeps a paid session with no seats/credits applied.
    if (isPricingCheckoutSession(event) && !pricingOk) {
      console.error("[billing/webhook] pricing checkout fulfillment failed", {
        type: event.type,
        id: event.id,
      });
      return new NextResponse("Pricing checkout fulfillment failed", { status: 500 });
    }

    // Zrušenie, zmena miest a zlyhaná platba sa premietnu na kanceláriu. Chyba sa
    // nepolyká: non-2xx znamená, že Stripe udalosť zopakuje.
    try {
      await syncAgencyBillingLifecycle(event);
    } catch (error) {
      console.error("[billing/webhook] lifecycle sync failed", {
        type: event.type,
        id: event.id,
        error: describeError(error),
      });
      return new NextResponse("Billing lifecycle sync failed", { status: 500 });
    }

    await handleStripeWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    const result = autoErrorCapture(error, "POST /api/billing/webhook");
    return new NextResponse(result.error, { status: 400 });
  }
}
