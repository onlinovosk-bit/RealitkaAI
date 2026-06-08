export const dynamic = "force-dynamic";

import { errorResponse, okResponse } from "@/lib/api-response";
import { resolveImportAuthContext } from "@/lib/universal-import/import-context";
import { runUniversalImport } from "@/lib/universal-import/import-runner";
import { getImportJob } from "@/lib/universal-import/import-store";

export async function POST(request: Request) {
  try {
    const ctx = await resolveImportAuthContext();
    if (!ctx) return errorResponse("Unauthorized", 401);

    const body = (await request.json()) as { jobId?: string };
    if (!body.jobId) return errorResponse("Chýba jobId.", 400);

    const job = await getImportJob(body.jobId);
    if (!job) return errorResponse("Import job nenájdený.", 404);
    if (job.agencyId !== ctx.agencyId) return errorResponse("Forbidden", 403);
    if (!job.columnMapping) return errorResponse("Najprv potvrď mapovanie stĺpcov.", 400);
    if (job.status === "importing") {
      return errorResponse("Import už prebieha.", 409);
    }
    if (job.status === "done") {
      return errorResponse("Import už bol dokončený.", 409);
    }

    const report = await runUniversalImport(ctx.supabase, job);

    return okResponse({ report });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Import zlyhal.", 500);
  }
}
