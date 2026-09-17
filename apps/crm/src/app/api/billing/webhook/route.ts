import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { handleStripeWebhookEvent, verifyStripeWebhook } from "@/lib/billing-store";
import { handlePricingCheckoutWebhook } from "@/lib/credits-billing-webhook";
import { autoErrorCapture } from "@/lib/auto-error-capture";

/** Seat / top-up / starter-pack — fulfilled only by handlePricingCheckoutWebhook. */
function isPricingCheckoutSession(event: Stripe.Event): boolean {
  if (event.type !== "checkout.session.completed") return false;
  const session = event.data.object as Stripe.Checkout.Session;
  const checkoutType = session.metadata?.checkoutType;
  return (
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

    await handleStripeWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    const result = autoErrorCapture(error, "POST /api/billing/webhook");
    return new NextResponse(result.error, { status: 400 });
  }
}
