import { createServiceRoleClient } from "@/lib/supabase/admin";

import { defaultEnrichmentProviders } from "./providers";
import type {
  EnrichmentAuditEntry,
  EnrichmentInputRecord,
  EnrichmentProvider,
  EnrichmentResult,
} from "./types";

function inferFields(record: EnrichmentInputRecord): string[] {
  return Object.keys(record.data).filter((field) => field !== "id" && field !== "agency_id");
}

async function persistAudit(entries: EnrichmentAuditEntry[]): Promise<void> {
  if (!entries.length) return;
  const sb = createServiceRoleClient();
  if (!sb) return;
  const { error } = await sb.from("enrichment_log").insert(
    entries.map((entry) => ({
      agency_id: entry.agency_id,
      record_id: entry.record_id,
      record_type: entry.record_type,
      field: entry.field,
      source: entry.source,
      value: entry.value,
    })),
  );
  if (error) {
    throw new Error(`[enrichment] failed to write enrichment_log: ${error.message}`);
  }
}

export async function enrichRecordWaterfall(params: {
  record: EnrichmentInputRecord;
  providers?: EnrichmentProvider[];
  fields?: string[];
  persistAudit?: boolean;
}): Promise<EnrichmentResult> {
  const providers = params.providers ?? defaultEnrichmentProviders;
  const fields = params.fields?.length ? params.fields : inferFields(params.record);
  const enrichedRecord: Record<string, unknown> = { ...params.record.data };
  const audit: EnrichmentAuditEntry[] = [];

  for (const field of fields) {
    for (const provider of providers) {
      if (!provider.canHandle(field)) continue;
      const result = await provider.fetch({ record: params.record, field });
      if (!result) continue;
      enrichedRecord[field] = result.value;
      audit.push({
        agency_id: params.record.agencyId,
        record_id: params.record.id,
        record_type: params.record.type,
        field,
        source: result.source,
        value: result.value,
      });
      break;
    }
  }

  if (params.persistAudit !== false) {
    await persistAudit(audit);
  }

  return { enrichedRecord, audit };
}
