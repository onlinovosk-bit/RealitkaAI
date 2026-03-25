import { okResponse, errorResponse } from "@/lib/api-response";
import { runSmokeTests } from "@/lib/smoke-tests";

export async function GET() {
  try {
    const result = await runSmokeTests();
    return okResponse(result);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Smoke test zlyhal.",
      500
    );
  }
}
