import { NextResponse } from "next/server";
import { handleStripeWebhookEvent, verifyStripeWebhook } from "@/lib/billing-store";
import { autoErrorCapture } from "@/lib/auto-error-capture";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return new NextResponse("Missing stripe-signature header", { status: 400 });
    }

    const payload = await request.text();
    const event = verifyStripeWebhook(payload, signature);

    await handleStripeWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    const result = autoErrorCapture(error, "POST /api/billing/webhook");
    return new NextResponse(result.error, { status: 400 });
  }
}
