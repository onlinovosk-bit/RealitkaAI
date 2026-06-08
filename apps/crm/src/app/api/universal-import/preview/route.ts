export const dynamic = "force-dynamic";

import { errorResponse, okResponse } from "@/lib/api-response";
import { mapContactFromRow, validateMappedContact } from "@/lib/universal-import/map-contact";
import { resolveImportAuthContext } from "@/lib/universal-import/import-context";
import { getImportJob, listImportRows } from "@/lib/universal-import/import-store";
import type { MappedContact } from "@/lib/universal-import/types";

export async function GET(request: Request) {
  try {
    const ctx = await resolveImportAuthContext();
    if (!ctx) return errorResponse("Unauthorized", 401);

    const jobId = new URL(request.url).searchParams.get("jobId");
    if (!jobId) return errorResponse("Chýba jobId.", 400);

    const job = await getImportJob(jobId);
    if (!job) return errorResponse("Import job nenájdený.", 404);
    if (job.agencyId !== ctx.agencyId) return errorResponse("Forbidden", 403);
    if (!job.columnMapping) return errorResponse("Najprv potvrď mapovanie stĺpcov.", 400);

    const rows = await listImportRows(jobId, 5);
    const preview: MappedContact[] = [];
    const warnings: string[] = [];
    let missingName = 0;
    let missingContact = 0;

    for (const row of rows) {
      const mapped = mapContactFromRow(row.rawData, job.columnMapping);
      const skip = validateMappedContact(mapped);
      if (skip === "missing_name") missingName += 1;
      if (skip === "missing_contact") missingContact += 1;
      if (mapped.contact_name) {
        preview.push(mapped as MappedContact);
      }
    }

    if (missingName > 0) {
      warnings.push(`${missingName} z prvých riadkov nemá meno.`);
    }
    if (missingContact > 0) {
      warnings.push(`${missingContact} z prvých riadkov nemá telefón ani email.`);
    }

    return okResponse({
      jobId,
      totalRows: job.totalRows,
      preview,
      warnings,
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Náhľad zlyhal.", 500);
  }
}
