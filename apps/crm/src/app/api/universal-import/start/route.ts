export const dynamic = "force-dynamic";

import { errorResponse, okResponse } from "@/lib/api-response";
import { buildAutoColumnMapping, mappingConfidenceLevel } from "@/lib/universal-import/auto-mapping";
import { detectColumnsFromHeaders } from "@/lib/universal-import/column-detector";
import { applyLearnedMappings, loadLearnedMappings } from "@/lib/universal-import/learned-mappings";
import { MAX_IMPORT_FILE_BYTES, MAX_IMPORT_ROWS, parseCsvBuffer } from "@/lib/universal-import/csv-parse";
import { resolveImportAuthContext } from "@/lib/universal-import/import-context";
import {
  createImportJob,
  saveDetectedColumns,
  saveImportRows,
  updateImportJobStatus,
} from "@/lib/universal-import/import-store";
import type { ImportSourceSystem } from "@/lib/universal-import/types";
import { SOURCE_SYSTEM_LABELS, UNSUPPORTED_IMPORT_HINT, isSupportedImportSource } from "@/lib/universal-import/types";
import { looksLikeZipContainer, parseXlsxBuffer, XlsxParseError } from "@/lib/universal-import/xlsx-parse";

const VALID_SOURCES = new Set(Object.keys(SOURCE_SYSTEM_LABELS));

export async function POST(request: Request) {
  try {
    const ctx = await resolveImportAuthContext();
    if (!ctx) return errorResponse("Unauthorized", 401);

    const form = await request.formData();
    const file = form.get("file");
    const sourceSystem = String(form.get("sourceSystem") ?? "").trim() as ImportSourceSystem;

    if (!(file instanceof File)) {
      return errorResponse("Chýba súbor na import (CSV alebo .xlsx).", 400);
    }
    if (!VALID_SOURCES.has(sourceSystem)) {
      return errorResponse("Neplatný zdrojový systém.", 400);
    }
    // BOD 5: zdroj bez parsera povie prečo a čo urobiť, nie „neplatný".
    if (!isSupportedImportSource(sourceSystem)) {
      return errorResponse(
        UNSUPPORTED_IMPORT_HINT[sourceSystem] ?? "Tento formát zatiaľ nevieme prečítať.",
        400,
      );
    }
    // BOD 5: strop na veľkosť súboru PRED načítaním do pamäte. Bez neho sa
    // do serverless funkcie načíta čokoľvek, čo používateľ pretiahne myšou.
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      return errorResponse(
        `Súbor má ${(file.size / 1_048_576).toFixed(1)} MB, limit je ${MAX_IMPORT_FILE_BYTES / 1_048_576} MB.`,
        413,
      );
    }

    const buffer = await file.arrayBuffer();
    // XLSX-IMPORT: formát podľa obsahu, nie podľa výberu v zozname.
    const isXlsx = looksLikeZipContainer(buffer);
    const formatLabel = isXlsx ? "Excel" : "CSV";
    let headers: string[];
    let rows: Record<string, string>[];
    try {
      ({ headers, rows } = isXlsx ? parseXlsxBuffer(buffer) : parseCsvBuffer(buffer));
    } catch (parseErr) {
      if (parseErr instanceof XlsxParseError) return errorResponse(parseErr.message, 400);
      throw parseErr;
    }

    if (!headers.length) {
      return errorResponse(`${formatLabel} nemá rozpoznateľné hlavičky.`, 400);
    }
    if (!rows.length) {
      return errorResponse(`${formatLabel} neobsahuje žiadne dáta.`, 400);
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      return errorResponse(`Maximálne ${MAX_IMPORT_ROWS} riadkov na import.`, 400);
    }

    const job = await createImportJob({
      agencyId: ctx.agencyId,
      createdBy: ctx.profileId,
      sourceSystem,
      fileName: file.name,
      fileSizeBytes: file.size,
    });

    await updateImportJobStatus(job.id, "detecting");

    const sampleRows = rows.slice(0, 10);
    let detectedColumns = detectColumnsFromHeaders(headers, sampleRows);

    const learnedMappings = await loadLearnedMappings(sourceSystem);
    const mappingSource: "auto" | "learned" = learnedMappings ? "learned" : "auto";
    if (learnedMappings) {
      detectedColumns = applyLearnedMappings(detectedColumns, learnedMappings);
    }

    const suggestedMapping = buildAutoColumnMapping(detectedColumns);
    const confidence = mappingConfidenceLevel(detectedColumns);

    await saveDetectedColumns(job.id, detectedColumns);
    await saveImportRows(
      job.id,
      ctx.agencyId,
      rows.map((rawData, index) => ({ rowNumber: index + 1, rawData })),
    );

    return okResponse({
      jobId: job.id,
      detectedColumns,
      suggestedMapping,
      confidence,
      mappingSource,
      totalRows: rows.length,
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Upload zlyhal.", 500);
  }
}
