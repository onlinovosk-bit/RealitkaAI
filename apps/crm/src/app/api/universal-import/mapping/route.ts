export const dynamic = "force-dynamic";

import { errorResponse, okResponse } from "@/lib/api-response";
import { resolveImportAuthContext } from "@/lib/universal-import/import-context";
import { getImportJob, saveColumnMapping } from "@/lib/universal-import/import-store";
import type { ColumnMapping, ConfirmMappingRequest } from "@/lib/universal-import/types";

export async function POST(request: Request) {
  try {
    const ctx = await resolveImportAuthContext();
    if (!ctx) return errorResponse("Unauthorized", 401);

    const body = (await request.json()) as ConfirmMappingRequest & {
      mappingSource?: "auto" | "manual" | "learned";
    };

    if (!body.jobId || !body.columnMapping) {
      return errorResponse("Chýba jobId alebo columnMapping.", 400);
    }

    const job = await getImportJob(body.jobId);
    if (!job) return errorResponse("Import job nenájdený.", 404);
    if (job.agencyId !== ctx.agencyId) return errorResponse("Forbidden", 403);

    const mapping = body.columnMapping as ColumnMapping;
    const hasName = Object.values(mapping).includes("contact_name");
    if (!hasName) {
      return errorResponse("Mapovanie musí obsahovať aspoň jeden stĺpec pre meno.", 400);
    }

    const mappingSource = body.mappingSource ?? "manual";
    await saveColumnMapping(body.jobId, mapping, mappingSource);

    return okResponse({ jobId: body.jobId });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Uloženie mapovania zlyhalo.", 500);
  }
}
