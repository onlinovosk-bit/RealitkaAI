import type { SupabaseClient } from "@supabase/supabase-js";
import { SignalContractError, type ExtractedSignal, type StoredSignal } from "./types";

/**
 * Persistence for extracted signals.
 *
 * Signals live apart from scores on purpose (engine contract §17): an
 * extraction is expensive and model-dependent, a score is cheap and
 * deterministic. Keeping them in one row would mean re-running the model every
 * time a rule changes, and would make old scores silently unreproducible.
 */

export interface PersistSignalsInput {
  agencyId: string;
  leadId: string;
  extractionVersion: string;
  signals: readonly ExtractedSignal[];
  extractedAt?: Date;
}

interface SignalRow {
  lead_id: string;
  agency_id: string;
  signal_name: string;
  value: string | null;
  confidence: string;
  evidence_span: string | null;
  source_field: string;
  extraction_version: string;
  extracted_at: string;
}

function toRow(input: PersistSignalsInput, signal: ExtractedSignal, extractedAt: string): SignalRow {
  return {
    lead_id: input.leadId,
    agency_id: input.agencyId,
    signal_name: signal.name,
    value: signal.value,
    confidence: signal.confidence,
    evidence_span: signal.evidenceSpan,
    source_field: signal.sourceField,
    extraction_version: input.extractionVersion,
    extracted_at: extractedAt,
  };
}

function fromRow(row: SignalRow): StoredSignal {
  return {
    leadId: row.lead_id,
    agencyId: row.agency_id,
    name: row.signal_name as StoredSignal["name"],
    value: row.value,
    confidence: row.confidence as StoredSignal["confidence"],
    evidenceSpan: row.evidence_span,
    sourceField: row.source_field,
    extractionVersion: row.extraction_version,
    extractedAt: row.extracted_at,
  };
}

/**
 * Write one extraction pass.
 *
 * Upsert on (lead_id, signal_name, extraction_version): re-running the same
 * extractor version over the same lead replaces its own rows and leaves every
 * other version alone, so a re-run is idempotent and history is not rewritten.
 */
export async function persistSignals(
  client: SupabaseClient,
  input: PersistSignalsInput,
): Promise<{ written: number }> {
  if (!input.agencyId) throw new SignalContractError("<input>", "agencyId is required");
  if (!input.leadId) throw new SignalContractError("<input>", "leadId is required");
  if (!input.extractionVersion) {
    throw new SignalContractError(
      "<input>",
      "extractionVersion is required — an unversioned extraction cannot be re-scored later",
    );
  }
  if (input.signals.length === 0) return { written: 0 };

  const extractedAt = (input.extractedAt ?? new Date()).toISOString();
  const rows = input.signals.map((signal) => toRow(input, signal, extractedAt));

  const { error } = await client
    .from("lead_signals")
    .upsert(rows, { onConflict: "lead_id,signal_name,extraction_version" });

  if (error) throw new Error(error.message);
  return { written: rows.length };
}

/**
 * Read a lead's signals for one extractor version.
 *
 * The version is required rather than defaulted to "the newest": scoring must
 * state which extraction it is reading, otherwise a re-extraction silently
 * changes yesterday's score and the determinism the rules promise is gone.
 */
export async function readSignals(
  client: SupabaseClient,
  agencyId: string,
  leadId: string,
  extractionVersion: string,
): Promise<StoredSignal[]> {
  const { data, error } = await client
    .from("lead_signals")
    .select("lead_id, agency_id, signal_name, value, confidence, evidence_span, source_field, extraction_version, extracted_at")
    .eq("agency_id", agencyId)
    .eq("lead_id", leadId)
    .eq("extraction_version", extractionVersion);

  if (error) throw new Error(error.message);
  return ((data ?? []) as SignalRow[]).map(fromRow);
}
