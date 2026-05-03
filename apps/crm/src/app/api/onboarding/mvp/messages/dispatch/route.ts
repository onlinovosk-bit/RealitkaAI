import { errorResponse, okResponse } from "@/lib/api-response";
import { runOnboardingDispatch } from "@/lib/onboarding-dispatch";

export async function POST() {
  try {
    const result = await runOnboardingDispatch();
    return okResponse(result);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "dispatch_failed", 500);
  }
}
