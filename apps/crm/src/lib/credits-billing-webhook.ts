import type Stripe from "stripe";
import {
  applySeatCheckoutEntitlements,
  applyTopupPurchase,
  triggerInitialGrantAfterSeatCheckout,
} from "@/lib/credits-billing";
import { parseSeatTier, parseTopupPackageKey } from "@/lib/program-tier-pricing";
import { fulfillStarterPackPurchase } from "@/lib/starter-pack/fulfillment";

/**
 * PR-4 pricing checkout webhook branch — seat + credit top-up.
 * Legacy planKey checkout ostáva v billing-store.ts (nemeniť).
 */
export async function handlePricingCheckoutWebhook(
  event: Stripe.Event,
): Promise<boolean> {
  if (event.type !== "checkout.session.completed") return false;

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata ?? {};
  const checkoutType = meta.checkoutType;

  if (checkoutType === "seat") {
    const agencyId = meta.agencyId;
    const seatTier = parseSeatTier(meta.seatTier);
    const seatQuantity = Number(meta.seatQuantity ?? "1");
    const ownerCockpit = meta.ownerCockpit === "true";

    if (!agencyId) {
      console.warn("[pricing-webhook] seat checkout missing agencyId");
      return false;
    }

    const ok = await applySeatCheckoutEntitlements({
      agencyId,
      authUserId: meta.authUserId,
      seatTier,
      seatQuantity,
      ownerCockpit,
      stripeCustomerId:
        typeof session.customer === "string" ? session.customer : session.customer?.id,
      stripeSubscriptionId:
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id,
    });

    if (ok) {
      await triggerInitialGrantAfterSeatCheckout(agencyId);
    }
    return ok;
  }

  if (checkoutType === "credit_topup") {
    const agencyId = meta.agencyId;
    const packageKey = parseTopupPackageKey(meta.topupPackage);

    if (!agencyId || !packageKey) {
      console.warn("[pricing-webhook] topup checkout missing agencyId or package");
      return false;
    }

    return applyTopupPurchase({
      agencyId,
      packageKey,
      stripeSessionId: session.id,
    });
  }

  if (checkoutType === "starter_pack") {
    const result = await fulfillStarterPackPurchase({
      stripeSessionId: session.id,
      customerEmail: session.customer_details?.email ?? session.customer_email,
    });
    return result !== null;
  }

  return false;
}
