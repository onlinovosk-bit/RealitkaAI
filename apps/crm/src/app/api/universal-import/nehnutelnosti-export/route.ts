export const dynamic = "force-dynamic";

import { errorResponse, okResponse } from "@/lib/api-response";
import { resolveImportAuthContext } from "@/lib/universal-import/import-context";
import { createImportJob, recordMigrationCaseFromImport } from "@/lib/universal-import/import-store";
import {
  formatNehnutelnostiDryRunReport,
  nehnutelnostiDryRunToImportReport,
  runNehnutelnostiExportImportFromText,
} from "@/lib/universal-import/nehnutelnosti";

export async function POST(request: Request) {
  try {
    const ctx = await resolveImportAuthContext();
    if (!ctx) return errorResponse("Unauthorized", 401);

    const url = new URL(request.url);
    const dryRun = url.searchParams.get("dryRun") !== "false";

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return errorResponse("Chýba exportný súbor (CSV alebo JSON).", 400);
    }

    const text = await file.text();
    const { report, mapped, leads } = runNehnutelnostiExportImportFromText(text, {
      agencyId: ctx.agencyId,
      dryRun,
    });

    const importReport = nehnutelnostiDryRunToImportReport(report, file.name);

    if (!dryRun) {
      const job = await createImportJob({
        agencyId: ctx.agencyId,
        createdBy: ctx.profileId,
        sourceSystem: "nehnutelnosti_sk",
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
          job: { ...job, sourceSystem: "nehnutelnosti_sk" },
          report: importReport,
          agencyId: ctx.agencyId,
          agencyName: agency?.name?.trim() || "Neznáma agentúra",
          mappedRows: mapped.map((m) => m.lead),
        });
      } catch (migrationErr) {
        console.error(
          "[universal-import/nehnutelnosti-export] migration_cases insert failed:",
          migrationErr instanceof Error ? migrationErr.message : migrationErr,
        );
      }
    }

    return okResponse({
      dryRun,
      report: importReport,
      readable: formatNehnutelnostiDryRunReport(report),
      summary: report.summary,
      format: report.format,
      exportSource: report.exportSource,
      leadsPreview: leads.slice(0, 5),
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Nehnuteľnosti.sk export import zlyhal.",
      500,
    );
  }
}
