export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { resolveImportAuthContext } from "@/lib/universal-import/import-context";
import { getImportJob, listImportErrorRows } from "@/lib/universal-import/import-store";

function escapeCsv(value: string | number | null | undefined): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    const ctx = await resolveImportAuthContext();
    if (!ctx) return errorResponse("Unauthorized", 401);

    const jobId = new URL(request.url).searchParams.get("jobId");
    if (!jobId) return errorResponse("Chýba jobId.", 400);

    const job = await getImportJob(jobId);
    if (!job) return errorResponse("Import job nenájdený.", 404);
    if (job.agencyId !== ctx.agencyId) return errorResponse("Forbidden", 403);

    const errorRows = await listImportErrorRows(jobId);
    if (errorRows.length === 0) {
      return errorResponse("Import nemá chybné ani preskočené riadky.", 404);
    }

    const headers = new Set<string>();
    for (const row of errorRows) {
      for (const key of Object.keys(row.rawData)) {
        headers.add(key);
      }
    }

    const csvHeaders = ["row_number", "status", "skip_reason", ...Array.from(headers).sort()];
    const csvLines = errorRows.map((row) =>
      csvHeaders
        .map((header) => {
          if (header === "row_number") return escapeCsv(row.rowNumber);
          if (header === "status") return escapeCsv(row.status);
          if (header === "skip_reason") return escapeCsv(row.skipReason ?? "");
          return escapeCsv(row.rawData[header] ?? "");
        })
        .join(","),
    );

    const csv = [csvHeaders.join(","), ...csvLines].join("\n");
    const safeName = job.fileName.replace(/[^\w.-]+/g, "_").slice(0, 80);
    const filename = `import-errors_${safeName || jobId}.csv`;

    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=${filename}`,
      },
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Export chýb zlyhal.", 500);
  }
}
