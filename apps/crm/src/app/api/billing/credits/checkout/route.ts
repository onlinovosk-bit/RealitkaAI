import { okResponse, errorResponse } from "@/lib/api-response";
import {
  createTopupCheckoutSession,
  createSeatCheckoutSession,
  parseCheckoutBody,
} from "@/lib/credits-billing";
import {
  PRICING_V2_MAX_CREDITS_PER_PURCHASE,
  createPricingV2CheckoutSession,
  missingPricingV2PriceEnvKeysForRequest,
} from "@/lib/credits-billing-v2";
import { isPricingV2Enabled } from "@/lib/pricing-v2";
import {
  PRICING_V2_CHECKOUT_TYPE_CREDITS,
  PRICING_V2_ERROR_CODES,
  parsePricingV2CheckoutRequest,
} from "@/lib/pricing-v2-contract";
import {
  areSeatCheckoutPricesConfigured,
  areTopupCheckoutPricesConfigured,
} from "@/lib/program-tier-pricing";

export async function POST(request: Request) {
  let isV2Request = false;
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Cenník v2 (pricing_v2 / pricing_v2_credits). Iné typy idú legacy cestou nižšie, nezmenené.
    const v2 = parsePricingV2CheckoutRequest(body);
    if (v2.ok || v2.reason !== "not_pricing_v2") {
      isV2Request = true;
      if (!isPricingV2Enabled()) {
        return errorResponse("Cenník v2 nie je dostupný.", 404, { code: PRICING_V2_ERROR_CODES.disabled });
      }
      if (!v2.ok) {
        return errorResponse("Neplatná požiadavka na checkout.", 400, {
          code: PRICING_V2_ERROR_CODES.invalidRequest,
          reason: v2.reason,
        });
      }
      if (
        v2.value.checkoutType === PRICING_V2_CHECKOUT_TYPE_CREDITS &&
        v2.value.credits > PRICING_V2_MAX_CREDITS_PER_PURCHASE
      ) {
        return errorResponse("Neplatná požiadavka na checkout.", 400, {
          code: PRICING_V2_ERROR_CODES.invalidRequest,
          reason: "invalid_credits",
        });
      }
      const missing = missingPricingV2PriceEnvKeysForRequest(v2.value);
      if (missing.length > 0) {
        return errorResponse("Checkout nie je dostupný — chýbajú Stripe ceny.", 503, {
          code: PRICING_V2_ERROR_CODES.pricesNotConfigured,
          missingPriceEnvKeys: missing,
        });
      }
      const outcome = await createPricingV2CheckoutSession(v2.value);
      if (outcome.kind === "legacy_subscription") {
        return errorResponse(
          "Kancelária má existujúce predplatné; cenník v2 sa naň automaticky nepresúva.",
          409,
          { code: PRICING_V2_ERROR_CODES.legacySubscription },
        );
      }
      if (outcome.kind === "subscription_exists") {
        return errorResponse("Kancelária už má aktívne predplatné cenníka v2; zmena ide cez správu predplatného.", 409, {
          code: "subscription_exists",
        });
      }
      if (outcome.kind === "unavailable" || !outcome.result.url) {
        return errorResponse("Checkout nie je dostupný.", 503);
      }
      return okResponse({ result: outcome.result });
    }

    const parsed = parseCheckoutBody(body);

    if (parsed.type === "topup" && parsed.topupPackage) {
      if (!areTopupCheckoutPricesConfigured()) {
        return errorResponse("Top-up checkout nie je dostupný — chýbajú Stripe ceny.", 503);
      }
      const result = await createTopupCheckoutSession(parsed.topupPackage);
      if (!result?.url) {
        return errorResponse("Top-up checkout nie je dostupný.", 503);
      }
      return okResponse({ result });
    }

    if (parsed.type === "seat" && parsed.seatTier) {
      if (!areSeatCheckoutPricesConfigured()) {
        return errorResponse("Seat checkout nie je dostupný — chýbajú Stripe ceny.", 503);
      }
      const result = await createSeatCheckoutSession({
        seatTier: parsed.seatTier,
        quantity: parsed.quantity ?? 1,
        includeOwnerCockpit: parsed.includeOwnerCockpit,
      });
      if (!result?.url) {
        return errorResponse("Seat checkout nie je dostupný.", 503);
      }
      return okResponse({ result });
    }

    return errorResponse("Neplatný checkout typ.", 400);
  } catch (error) {
    console.error("[credits/checkout]", error);
    if (isV2Request) {
      // Vnútornú správu výnimky zákazníkovi neukazujeme; klient to zobrazí ako „nie je dostupné“.
      return errorResponse("Checkout nie je dostupný.", 503, { code: PRICING_V2_ERROR_CODES.checkoutFailed });
    }
    const message = error instanceof Error ? error.message : "Checkout zlyhal.";
    return errorResponse(message, 400);
  }
}
