import { okResponse, errorResponse } from "@/lib/api-response";
import { getCurrentPlanTier } from "@/lib/billing-store";

export async function GET() {
  try {
    const tier = await getCurrentPlanTier();
    return okResponse({ tier });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa načítať plán.",
      400
    );
  }
}
