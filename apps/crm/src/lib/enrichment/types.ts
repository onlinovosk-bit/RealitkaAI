export type EnrichmentRecordType = "contact" | "property" | "lead";

export interface EnrichmentInputRecord {
  id: string;
  agencyId: string;
  type: EnrichmentRecordType;
  data: Record<string, unknown>;
}

export interface EnrichmentProviderResult {
  value: unknown;
  source: string;
}

export interface EnrichmentProviderContext {
  record: EnrichmentInputRecord;
  field: string;
}

export interface EnrichmentProvider {
  name: string;
  canHandle(field: string): boolean;
  fetch(ctx: EnrichmentProviderContext): Promise<EnrichmentProviderResult | null>;
}

export interface EnrichmentAuditEntry {
  agency_id: string;
  record_id: string;
  record_type: EnrichmentRecordType;
  field: string;
  source: string;
  value: unknown;
}

export interface EnrichmentResult {
  enrichedRecord: Record<string, unknown>;
  audit: EnrichmentAuditEntry[];
}
