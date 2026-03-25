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
    return okResponse({ result });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa vytvoriť checkout session.",
      400
    );
  }
}
