import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { RealsoftAction } from "@/lib/realsoft/payload";

type StoreInput = {
  agencyId: string;
  action: RealsoftAction;
  rawPayload: unknown;
  externalId: string | null;
  unmapped?: Record<string, unknown> | null;
};

export type StoreRealsoftResult =
  | { ok: true; id: string; duplicate: boolean }
  | { ok: false; error: string };

export async function storeRealsoftImportLog(input: StoreInput): Promise<StoreRealsoftResult> {
  const sb = createServiceRoleClient();
  if (!sb) return { ok: false, error: "DB client unavailable" };

  const payload = {
    agency_id: input.agencyId,
    action: input.action,
    external_id: input.externalId,
    raw_payload: input.rawPayload,
    unmapped: input.unmapped ?? null,
  };

  const { data, error } = await sb
    .from("realsoft_import_logs")
    .upsert(payload, {
      onConflict: "agency_id,action,external_id",
      ignoreDuplicates: true,
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data?.id) {
    return { ok: true, id: "", duplicate: true };
  }

  return { ok: true, id: data.id, duplicate: false };
}

export async function createUniversalImportArtifacts(params: {
  agencyId: string;
  action: RealsoftAction;
  logId: string;
  payload: unknown;
}) {
  const sb = createServiceRoleClient();
  if (!sb) return;

  const fileName = `realsoft-action-${params.action}.json`;
  const payloadText = JSON.stringify(params.payload ?? {});
  const payloadSize = Buffer.byteLength(payloadText, "utf8");

  const { data: job, error: jobErr } = await sb
    .from("import_jobs")
    .insert({
      agency_id: params.agencyId,
      created_by: null,
      source_system: "realsoft",
      file_name: fileName,
      file_size_bytes: payloadSize,
      status: "pending",
      total_rows: 1,
    })
    .select("id")
    .single();

  if (jobErr || !job?.id) return;

  await sb.from("import_rows").insert({
    job_id: job.id,
    agency_id: params.agencyId,
    row_number: 1,
    raw_data: {
      source: "realsoft-import-receiver",
      action: params.action,
      log_id: params.logId,
    },
    mapped_data: null,
    status: "pending",
  });

  await sb.from("migration_cases").insert({
    agency_id: params.agencyId,
    agency_name: "RealSoft API import",
    source_crm: "realsoft",
    export_available: true,
    export_types: ["api"],
    total_contacts_exported: 1,
    total_contacts_imported: 0,
    migration_attempts: 1,
    blocker_types: ["technical"],
    blocker_notes: "Mapper blocked until real RealSoft payload sample is provided.",
    notes: `realsoft_import_log_id=${params.logId}`,
  });
}

