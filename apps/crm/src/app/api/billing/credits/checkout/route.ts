import { okResponse, errorResponse } from "@/lib/api-response";
import {
  createTopupCheckoutSession,
  createSeatCheckoutSession,
  parseCheckoutBody,
} from "@/lib/credits-billing";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseCheckoutBody(body);

    if (parsed.type === "topup" && parsed.topupPackage) {
      const result = await createTopupCheckoutSession(parsed.topupPackage);
      if (!result?.url) {
        return errorResponse("Top-up checkout nie je dostupný.", 503);
      }
      return okResponse({ result });
    }

    if (parsed.type === "seat" && parsed.seatTier) {
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
    const message = error instanceof Error ? error.message : "Checkout zlyhal.";
    console.error("[credits/checkout]", error);
    return errorResponse(message, 400);
  }
}
