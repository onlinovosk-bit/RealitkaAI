import type { PricingV2Interval } from "@/lib/pricing-v2";
import {
  PRICING_V2_CHECKOUT_TYPE_CREDITS,
  PRICING_V2_CHECKOUT_TYPE_PLAN,
  PRICING_V2_ERROR_CODES,
  type PricingV2CheckoutRequest,
} from "@/lib/pricing-v2-contract";

export type PricingV2CheckoutOutcome =
  | { kind: "redirect"; url: string }
  | { kind: "error"; code: string; message: string };

export const PRICING_V2_MESSAGES = {
  unavailable: "Objednávka nie je zatiaľ dostupná.",
  disabled: "Nový cenník zatiaľ nie je zapnutý.",
  legacySubscription: "Predplatné máte dohodnuté. Pre zmenu nás prosím kontaktujte.",
  subscriptionExists: "Vaša kancelária už má aktívne predplatné. Zmenu pásma urobíte v správe predplatného.",
  invalid: "Objednávku sa nepodarilo vytvoriť. Skontrolujte počet používateľov a balík.",
  generic: "Nepodarilo sa spustiť objednávku. Skúste to znova.",
} as const;

/**
 * Kód odpovede 409, keď kancelária už má aktívne v2 predplatné (route `credits/checkout`). V zmrazenom kontrakte
 * `PRICING_V2_ERROR_CODES` nie je (tam je len `legacy_subscription`), preto je tu lokálne.
 */
export const SUBSCRIPTION_EXISTS_CODE = "subscription_exists";

export function buildPlanRequest(
  users: number,
  packCredits: number | null,
  interval: PricingV2Interval = "month",
): PricingV2CheckoutRequest {
  // Ročný plán sa s mesačným balíkom kreditov nekombinuje (iný interval fakturácie).
  return {
    checkoutType: PRICING_V2_CHECKOUT_TYPE_PLAN,
    users,
    packCredits: interval === "year" ? null : packCredits,
    interval,
  };
}

export function buildCreditsRequest(credits: number): PricingV2CheckoutRequest {
  return { checkoutType: PRICING_V2_CHECKOUT_TYPE_CREDITS, credits };
}

/** Zavolá checkout a premení odpoveď (aj chybovú) na výsledok, ktorý UI vie zobraziť. */
export async function submitPricingV2Checkout(body: PricingV2CheckoutRequest): Promise<PricingV2CheckoutOutcome> {
  let res: Response;
  try {
    res = await fetch("/api/billing/credits/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { kind: "error", code: "network", message: PRICING_V2_MESSAGES.generic };
  }

  let data: { ok?: boolean; code?: string; result?: { url?: string } } = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (res.ok && data.ok && typeof data.result?.url === "string" && data.result.url) {
    return { kind: "redirect", url: data.result.url };
  }

  const code = data.code;
  // Kancelária s existujúcim v2 predplatným NIE JE legacy zákazník: iná hláška (zmena pásma v správe predplatného).
  if (code === SUBSCRIPTION_EXISTS_CODE) {
    return { kind: "error", code: SUBSCRIPTION_EXISTS_CODE, message: PRICING_V2_MESSAGES.subscriptionExists };
  }
  if (res.status === 409 || code === PRICING_V2_ERROR_CODES.legacySubscription) {
    return { kind: "error", code: PRICING_V2_ERROR_CODES.legacySubscription, message: PRICING_V2_MESSAGES.legacySubscription };
  }
  if (res.status === 404 || code === PRICING_V2_ERROR_CODES.disabled) {
    return { kind: "error", code: PRICING_V2_ERROR_CODES.disabled, message: PRICING_V2_MESSAGES.disabled };
  }
  if (res.status === 503 || code === PRICING_V2_ERROR_CODES.pricesNotConfigured) {
    return { kind: "error", code: PRICING_V2_ERROR_CODES.pricesNotConfigured, message: PRICING_V2_MESSAGES.unavailable };
  }
  if (res.status === 400 || code === PRICING_V2_ERROR_CODES.invalidRequest) {
    return { kind: "error", code: PRICING_V2_ERROR_CODES.invalidRequest, message: PRICING_V2_MESSAGES.invalid };
  }
  return { kind: "error", code: "unknown", message: PRICING_V2_MESSAGES.generic };
}
