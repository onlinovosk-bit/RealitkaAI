import { okResponse, errorResponse } from "@/lib/api-response";
import {
  CheckoutConfigError,
  createTopupCheckoutSession,
  createSeatCheckoutSession,
  parseCheckoutBody,
} from "@/lib/credits-billing";
import {
  areSeatCheckoutPricesConfigured,
  areTopupCheckoutPricesConfigured,
} from "@/lib/program-tier-pricing";

/**
 * CHECKOUT-FAILCLOSED-01 — jediná route, ktorá berie peniaze, nesmie klamať
 * o príčine.
 *
 * Správa pre zákazníka je vždy jedna z týchto konštánt. `error.message` sa do
 * odpovede nevracia nikdy: pôvodný `catch` posielal interné hlášky („Owner
 * Cockpit Stripe price nie je nakonfigurovaný.") rovno do UI, a to so stavom
 * **400**, čiže s tvrdením, že chybu urobil zákazník.
 */
const UNAVAILABLE =
  "Platbu teraz nevieme spustiť. Skús to o chvíľu znova; ak to potrvá, napíš nám.";
const BAD_REQUEST = "Neplatný checkout typ.";

export async function POST(request: Request) {
  // Nečitateľné telo je JEDINÁ vec, ktorú naozaj pokazil volajúci — preto má
  // vlastný try. Keby padalo do spoločného catchu nižšie, vrátilo by 500 za
  // chybu klienta.
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(BAD_REQUEST, 400);
  }

  try {
    const parsed = parseCheckoutBody(body);

    if (parsed.type === "topup" && parsed.topupPackage) {
      if (!areTopupCheckoutPricesConfigured()) {
        return errorResponse(UNAVAILABLE, 503);
      }
      const result = await createTopupCheckoutSession(parsed.topupPackage);
      if (!result?.url) {
        return errorResponse(UNAVAILABLE, 503);
      }
      return okResponse({ result });
    }

    if (parsed.type === "seat" && parsed.seatTier) {
      if (!areSeatCheckoutPricesConfigured()) {
        return errorResponse(UNAVAILABLE, 503);
      }

      // Cockpit tu zámerne NEMÁ druhú bránu. `buildSeatCheckoutSessionParams`
      // ho stráži `isOwnerCockpitPurchasable` s tým istým `founderEligible`,
      // aký vidí UI — a founder (249 €) a štandardná (349 €) cena sú dva
      // Stripe objekty bez fallbacku, takže kontrola tej druhej by prepustila
      // kúpu za cenu, ktorú UI neukázalo. Kópia predikátu tu by počítala
      // `quantity` inak než knižnica (tá ju dvíha na `minSeats`), čiže by sa
      // obe brány časom rozišli. Jedna brána, a `CheckoutConfigError` z nej
      // dorazí sem ako 503.
      const result = await createSeatCheckoutSession({
        seatTier: parsed.seatTier,
        quantity: parsed.quantity ?? 1,
        includeOwnerCockpit: parsed.includeOwnerCockpit,
      });
      if (!result?.url) {
        return errorResponse(UNAVAILABLE, 503);
      }
      return okResponse({ result });
    }

    return errorResponse(BAD_REQUEST, 400);
  } catch (error) {
    // 400 patrí len neplatnej požiadavke. Náš nepripravený koniec je 503,
    // čokoľvek neočakávané je 500 — a zákazník v žiadnom z tých dvoch
    // prípadov nečíta našu internú hlášku, tá ide do logu.
    console.error("[credits/checkout]", error);
    if (error instanceof CheckoutConfigError) {
      return errorResponse(UNAVAILABLE, 503);
    }
    return errorResponse(UNAVAILABLE, 500);
  }
}
