import { okResponse, errorResponse } from "@/lib/api-response";
import { importPortalLeadsFromCsv } from "@/lib/integrations-store";
import { requireFeature } from "@/lib/feature-gating";

export async function POST(request: Request) {
  try {
    await requireFeature("integrations");

    const body = await request.json();
    const csv = String(body?.csv ?? "");

    if (!csv.trim()) {
      return errorResponse("Chýba CSV obsah.", 400);
    }

    const result = await importPortalLeadsFromCsv(csv);
    return okResponse({ result });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Portálový import zlyhal.",
      400
    );
  }
}
