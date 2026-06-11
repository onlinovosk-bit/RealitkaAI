export const dynamic = "force-dynamic";

import { errorResponse, okResponse } from "@/lib/api-response";
import { resolveImportAuthContext } from "@/lib/universal-import/import-context";
import { createImportJob, recordMigrationCaseFromImport } from "@/lib/universal-import/import-store";
import {
  formatRealviaDryRunReport,
  realviaDryRunToImportReport,
  runRealviaJsonImportFromText,
} from "@/lib/universal-import/realvia";

export async function POST(request: Request) {
  try {
    const ctx = await resolveImportAuthContext();
    if (!ctx) return errorResponse("Unauthorized", 401);

    const url = new URL(request.url);
    const dryRun = url.searchParams.get("dryRun") !== "false";

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return errorResponse("Chýba JSON súbor.", 400);
    }

    const text = await file.text();
    const { report, mapped } = runRealviaJsonImportFromText(text, {
      agencyId: ctx.agencyId,
      dryRun,
    });

    const importReport = realviaDryRunToImportReport(report, file.name);

    if (!dryRun) {
      const job = await createImportJob({
        agencyId: ctx.agencyId,
        createdBy: ctx.profileId,
        sourceSystem: "realvia-json",
        fileName: file.name,
        fileSizeBytes: file.size,
      });

      importReport.jobId = job.id;

      const { data: agency } = await ctx.supabase
        .from("agencies")
        .select("name")
        .eq("id", ctx.agencyId)
        .maybeSingle();

      try {
        await recordMigrationCaseFromImport({
          job: { ...job, sourceSystem: "realvia-json" },
          report: importReport,
          agencyId: ctx.agencyId,
          agencyName: agency?.name?.trim() || "Neznáma agentúra",
          mappedRows: mapped.map((m) => m.lead),
        });
      } catch (migrationErr) {
        console.error(
          "[universal-import/realvia-json] migration_cases insert failed:",
          migrationErr instanceof Error ? migrationErr.message : migrationErr,
        );
      }
    }

    return okResponse({
      dryRun,
      report: importReport,
      readable: formatRealviaDryRunReport(report),
      summary: report.summary,
      propertyMatchTodo: report.propertyMatchTodo,
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Realvia JSON import zlyhal.", 500);
  }
}
