import { okResponse, errorResponse } from "@/lib/api-response";
import { createBillingCheckoutSession } from "@/lib/billing-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const planKey = String(body?.planKey ?? "");

    if (!planKey) {
      return errorResponse("Chýba planKey.", 400);
    }

    const result = await createBillingCheckoutSession(planKey);

    if (!result) {
      return errorResponse(
        "Platobný systém (Stripe) nie je nakonfigurovaný. Kontaktujte podporu.",
        503
      );
    }

    if (!result.url) {
      return errorResponse(
        "Stripe checkout URL nebola vrátená. Skontrolujte konfiguráciu Stripe produktov a cien.",
        502
      );
    }

    return okResponse({ result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nepodarilo sa vytvoriť checkout session.";

    if (
      message.includes("is not available to be purchased") ||
      message.includes("product is not active")
    ) {
      return errorResponse(
        "Plán momentálne nie je dostupný na nákup. V Stripe je potrebné aktivovať produkt/cenu pre tento plán.",
        400
      );
    }

    console.error("Billing checkout error:", error);
    return errorResponse(message, 400);
  }
}
