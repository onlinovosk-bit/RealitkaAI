import type Stripe from "stripe";
import {
  applySeatCheckoutEntitlements,
  applyTopupPurchase,
  triggerInitialGrantAfterSeatCheckout,
} from "@/lib/credits-billing";
import {
  fulfillPricingV2CreditsCheckout,
  fulfillPricingV2PlanCheckout,
} from "@/lib/credits-billing-v2";
import {
  PRICING_V2_CHECKOUT_TYPE_CREDITS,
  PRICING_V2_CHECKOUT_TYPE_PLAN,
} from "@/lib/pricing-v2-contract";
import { parseSeatTier, parseTopupPackageKey } from "@/lib/program-tier-pricing";
import { fulfillStarterPackPurchase } from "@/lib/starter-pack/fulfillment";

/**
 * PR-4 pricing checkout webhook branch — seat + credit top-up.
 * Legacy planKey checkout ostáva v billing-store.ts (nemeniť).
 */

/** `unpaid` = čaká sa na asynchrónnu platbu; plnenie príde s checkout.session.async_payment_succeeded. */
function isSessionPaid(session: Stripe.Checkout.Session): boolean {
  return session.payment_status === "paid" || session.payment_status === "no_payment_required";
}

export async function handlePricingCheckoutWebhook(
  event: Stripe.Event,
): Promise<boolean> {
  const isCompleted = event.type === "checkout.session.completed";
  // Asynchrónna platba (napr. SEPA) dorazí až neskôr — rovnako pre v2 aj legacy seat/topup.
  const isAsyncPaid = event.type === "checkout.session.async_payment_succeeded";
  if (!isCompleted && !isAsyncPaid) return false;

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata ?? {};
  const checkoutType = meta.checkoutType;

  // Cenník v2: plní sa vždy, keď peniaze prišli (prepínač riadi vznik checkoutu, nie plnenie
  // už zaplatenej session). Neplatné metadáta = false → trasa vráti 500, nikdy tiché true.
  if (checkoutType === PRICING_V2_CHECKOUT_TYPE_PLAN) return fulfillPricingV2PlanCheckout(session);
  if (checkoutType === PRICING_V2_CHECKOUT_TYPE_CREDITS) return fulfillPricingV2CreditsCheckout(session);

  if (checkoutType === "seat") {
    // completed + unpaid: ACK bez plnenia (Stripe neskôr pošle async_payment_succeeded).
    // Bez tejto brány by SEPA aktivovala seats pred zúčtovaním.
    if (!isSessionPaid(session)) {
      console.info("[pricing-webhook] seat checkout awaiting payment", { sessionId: session.id });
      return true;
    }

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

    if (!ok) return false;

    // Grant fail-closed: bez kreditov by Stripe dostal 200 a už by neopakoval.
    // Entitlement aj grant sú idempotentné → retry je bezpečný.
    const grant = await triggerInitialGrantAfterSeatCheckout(agencyId);
    if (grant.error) {
      console.warn("[pricing-webhook] seat initial grant failed:", grant.error);
      return false;
    }
    return true;
  }

  if (checkoutType === "credit_topup") {
    if (!isSessionPaid(session)) {
      console.info("[pricing-webhook] topup checkout awaiting payment", { sessionId: session.id });
      return true;
    }

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
    // Starter pack: plnenie ostáva na completed (existujúce správanie); async bez plnenia.
    if (isAsyncPaid) return false;
    const result = await fulfillStarterPackPurchase({
      stripeSessionId: session.id,
      customerEmail: session.customer_details?.email ?? session.customer_email,
    });
    return result !== null;
  }

  return false;
}
