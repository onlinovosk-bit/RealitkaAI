import { okResponse, errorResponse } from "@/lib/api-response";
import { createCustomerPortalSession } from "@/lib/billing-store";

export async function POST() {
  try {
    const result = await createCustomerPortalSession();
    return okResponse({ result });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa vytvoriť customer portal session.",
      400
    );
  }
}
