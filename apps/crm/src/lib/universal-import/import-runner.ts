import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapContactFromRow,
  mappedContactToLeadInsert,
  validateMappedContact,
} from "@/lib/universal-import/map-contact";
import {
  SOURCE_SYSTEM_LABELS,
  type ImportJob,
  type ImportReport,
  type ImportRowError,
  type MappedContact,
  type SkipReason,
} from "@/lib/universal-import/types";

type ImportRowRecord = {
  id: string;
  row_number: number;
  raw_data: Record<string, string>;
  status: string;
};

const INSERT_CHUNK = 100;

function defaultSourceLabel(sourceSystem: ImportJob["sourceSystem"]): string {
  return `Universal Import — ${SOURCE_SYSTEM_LABELS[sourceSystem] ?? sourceSystem}`;
}

export async function runUniversalImport(
  supabase: SupabaseClient,
  job: ImportJob,
): Promise<ImportReport> {
  const columnMapping = job.columnMapping;
  if (!columnMapping || Object.keys(columnMapping).length === 0) {
    throw new Error("Chýba mapovanie stĺpcov.");
  }

  const startedAt = Date.now();

  await supabase
    .from("import_jobs")
    .update({ status: "importing", importing_at: new Date().toISOString() })
    .eq("id", job.id);

  const { data: rows, error: rowsError } = await supabase
    .from("import_rows")
    .select("id, row_number, raw_data, status")
    .eq("job_id", job.id)
    .eq("status", "pending")
    .order("row_number", { ascending: true });

  if (rowsError) throw new Error(rowsError.message);

  const pendingRows = (rows ?? []) as ImportRowRecord[];
  const defaultSource = defaultSourceLabel(job.sourceSystem);

  let importedRows = 0;
  let skippedRows = 0;
  let duplicateRows = 0;
  let errorRows = 0;
  const skipReasonCounts = new Map<SkipReason, number>();
  const errorLog: ImportRowError[] = [];

  const emailsInBatch = new Set<string>();
  const toInsert: Array<{ rowId: string; payload: Record<string, unknown> }> = [];
  const toUpdate: Array<{ rowId: string; leadId: string; payload: Record<string, unknown> }> = [];

  const emailList = pendingRows
    .map((row) => {
      const mapped = mapContactFromRow(row.raw_data, columnMapping);
      return mapped.email?.trim().toLowerCase() ?? "";
    })
    .filter(Boolean);

  const existingByEmail = new Map<string, string>();
  if (emailList.length > 0) {
    const uniqueEmails = [...new Set(emailList)];
    for (let i = 0; i < uniqueEmails.length; i += 200) {
      const chunk = uniqueEmails.slice(i, i + 200);
      const { data: existing } = await supabase
        .from("leads")
        .select("id, email")
        .eq("agency_id", job.agencyId)
        .in("email", chunk);
      for (const lead of existing ?? []) {
        if (lead.email) existingByEmail.set(String(lead.email).toLowerCase(), lead.id as string);
      }
    }
  }

  for (const row of pendingRows) {
    const mappedPartial = mapContactFromRow(row.raw_data, columnMapping);
    const skipReason = validateMappedContact(mappedPartial);

    if (skipReason) {
      skippedRows += 1;
      skipReasonCounts.set(skipReason, (skipReasonCounts.get(skipReason) ?? 0) + 1);
      errorLog.push({ row: row.row_number, reason: skipReason, data: row.raw_data });
      await supabase
        .from("import_rows")
        .update({ status: "skipped", skip_reason: skipReason, mapped_data: mappedPartial })
        .eq("id", row.id);
      continue;
    }

    const mapped = mappedPartial as MappedContact;
    const email = mapped.email?.trim().toLowerCase() ?? "";

    if (email && emailsInBatch.has(email)) {
      duplicateRows += 1;
      skipReasonCounts.set("duplicate_email", (skipReasonCounts.get("duplicate_email") ?? 0) + 1);
      await supabase
        .from("import_rows")
        .update({
          status: "duplicate",
          skip_reason: "duplicate_email",
          mapped_data: mapped,
        })
        .eq("id", row.id);
      continue;
    }

    if (email) emailsInBatch.add(email);

    const leadPayload = mappedContactToLeadInsert(mapped, job.agencyId, defaultSource);
    const existingId = email ? existingByEmail.get(email) : undefined;

    if (existingId) {
      toUpdate.push({
        rowId: row.id,
        leadId: existingId,
        payload: {
          name: leadPayload.name,
          phone: leadPayload.phone,
          location: leadPayload.location,
          budget: leadPayload.budget,
          source: leadPayload.source,
          note: leadPayload.note,
        },
      });
    } else {
      toInsert.push({ rowId: row.id, payload: leadPayload });
      if (email) existingByEmail.set(email, leadPayload.id as string);
    }
  }

  for (const item of toUpdate) {
    const { error } = await supabase.from("leads").update(item.payload).eq("id", item.leadId);
    if (error) {
      errorRows += 1;
      errorLog.push({ row: 0, reason: error.message });
      await supabase
        .from("import_rows")
        .update({ status: "error", skip_reason: "invalid_format" })
        .eq("id", item.rowId);
    } else {
      duplicateRows += 1;
      await supabase
        .from("import_rows")
        .update({ status: "duplicate", lead_id: item.leadId, skip_reason: "duplicate_email" })
        .eq("id", item.rowId);
    }
  }

  for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
    const chunk = toInsert.slice(i, i + INSERT_CHUNK);
    const payloads = chunk.map((c) => c.payload);
    const { error } = await supabase.from("leads").insert(payloads);

    if (error) {
      errorRows += chunk.length;
      for (const item of chunk) {
        errorLog.push({ row: 0, reason: error.message, data: item.payload as Record<string, string> });
        await supabase
          .from("import_rows")
          .update({ status: "error", skip_reason: "invalid_format" })
          .eq("id", item.rowId);
      }
    } else {
      importedRows += chunk.length;
      for (const item of chunk) {
        await supabase
          .from("import_rows")
          .update({
            status: "imported",
            lead_id: item.payload.id,
            mapped_data: mapContactFromRow(
              pendingRows.find((r) => r.id === item.rowId)?.raw_data ?? {},
              columnMapping,
            ),
          })
          .eq("id", item.rowId);
      }
    }
  }

  const completedAt = new Date().toISOString();
  const elapsedMs = Date.now() - startedAt;

  await supabase
    .from("import_jobs")
    .update({
      status: "done",
      imported_rows: importedRows,
      skipped_rows: skippedRows,
      duplicate_rows: duplicateRows,
      error_rows: errorRows,
      error_log: errorLog.slice(0, 100),
      completed_at: completedAt,
    })
    .eq("id", job.id);

  return {
    jobId: job.id,
    fileName: job.fileName,
    sourceSystem: job.sourceSystem,
    totalRows: job.totalRows,
    importedRows,
    skippedRows,
    duplicateRows,
    errorRows,
    timeToComplete: `${Math.round(elapsedMs / 1000)}s`,
    topSkipReasons: [...skipReasonCounts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}
