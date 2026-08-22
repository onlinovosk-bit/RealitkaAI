import { errorResponse, okResponse } from "@/lib/api-response";
import { runOnboardingDispatch } from "@/lib/onboarding-dispatch";
import { requireOnboardingOperator } from "@/lib/onboarding-mvp-auth";

export async function POST() {
  const gate = await requireOnboardingOperator();
  if (!gate.ok) return gate.response;

  try {
    const result = await runOnboardingDispatch();
    return okResponse(result);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "dispatch_failed", 500);
  }
}
