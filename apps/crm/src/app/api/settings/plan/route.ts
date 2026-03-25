import { okResponse, errorResponse } from "@/lib/api-response";
import { getSaasOpsSnapshot } from "@/lib/saas-ops";

export async function GET() {
  try {
    const result = await getSaasOpsSnapshot();
    return okResponse({ result });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa načítať SaaS ops snapshot.",
      400
    );
  }
}
