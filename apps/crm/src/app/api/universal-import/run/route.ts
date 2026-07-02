export const dynamic = "force-dynamic";

import { errorResponse, okResponse } from "@/lib/api-response";
import { resolveImportAuthContext } from "@/lib/universal-import/import-context";
import { runUniversalImport } from "@/lib/universal-import/import-runner";
import {
  getImportJob,
  listImportRows,
  recordMigrationCaseFromImport,
} from "@/lib/universal-import/import-store";

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

    const { data: agency } = await ctx.supabase
      .from("agencies")
      .select("name")
      .eq("id", ctx.agencyId)
      .maybeSingle();

    const rows = await listImportRows(job.id);
    const mappedRows = rows
      .map((row) => row.mappedData)
      .filter((row): row is Record<string, unknown> => row != null);

    try {
      await recordMigrationCaseFromImport({
        job,
        report,
        agencyId: ctx.agencyId,
        agencyName: agency?.name?.trim() || "Neznáma agentúra",
        mappedRows,
      });
    } catch (migrationErr) {
      console.error(
        "[universal-import/run] migration_cases insert failed:",
        migrationErr instanceof Error ? migrationErr.message : migrationErr,
      );
    }

    return okResponse({
      report: {
        ...report,
        downloadErrorCsvUrl: `/api/universal-import/errors?jobId=${job.id}`,
      },
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Import zlyhal.", 500);
  }
}
