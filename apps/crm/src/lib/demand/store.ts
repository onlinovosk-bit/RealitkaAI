/**
 * Persistence and scheduling for demand records.
 *
 * `lead_demands` is append-only: every extraction is a new row, the newest row
 * per lead is the current demand. Nothing here writes to `leads` — the demand
 * record is the source of truth and D4 matching reads it from here, so a
 * bad extraction can never overwrite a value a broker typed by hand.
 *
 * Off by default. `DEMAND_EXTRACTION_ENABLED=true` in the deployment is the
 * production switch, flipped only on founder GO.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { knownFields, isCoreComplete, type DemandRecord } from "./contract";
import { extractDemand, type ExtractInput } from "./extract";
import { demandMatchingEnabled, runDemandMatching } from "./match-store";

export function demandExtractionEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DEMAND_EXTRACTION_ENABLED === "true" && Boolean(env.ANTHROPIC_API_KEY);
}

export async function saveDemandRecord(
  admin: SupabaseClient,
  agencyId: string,
  leadId: string,
  rec: DemandRecord,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data, error } = await admin.from("lead_demands").insert({
    agency_id: agencyId,
    lead_id: leadId,
    contract_version: rec.contract_version,
    status: rec.status,
    demand: rec.demand,
    known_fields: knownFields(rec.demand).length,
    core_complete: isCoreComplete(rec.demand),
    extractor: rec.extractor,
    input_chars: rec.input_chars,
    extracted_at: rec.extracted_at,
  }).select("id").single();
  return error ? { ok: false, error: error.message } : { ok: true, id: String(data?.id) };
}

export type ScheduleDemandInput = ExtractInput & {
  admin: SupabaseClient;
  agencyId: string;
  leadId: string;
  source: string;
};

/**
 * Runs after the response, like the reply draft, so the e-mail Worker never
 * waits on the model. Logs counts and status only — no text, no values.
 */
export function scheduleDemandExtraction(d: ScheduleDemandInput): void {
  if (!demandExtractionEnabled()) return;
  const task = async () => {
    try {
      await runDemandExtraction(d);
    } catch (e) {
      console.error("[demand.schedule] failed", e instanceof Error ? e.message : String(e));
    }
  };
  try {
    after(task);
  } catch {
    void task();
  }
}

async function runDemandExtraction(d: ScheduleDemandInput): Promise<void> {
  const rec = await extractDemand({ inquiryText: d.inquiryText, leadName: d.leadName });
  const saved = await saveDemandRecord(d.admin, d.agencyId, d.leadId, rec);
  // D4: match right after a verified record exists. Separate switch, so D1 can
  // be measured before D4 writes anything.
  const match =
    saved.ok && saved.id && rec.status === "ok" && demandMatchingEnabled()
      ? await runDemandMatching(d.admin, {
          agencyId: d.agencyId,
          leadId: d.leadId,
          demandRecordId: saved.id,
          demand: rec.demand,
        })
      : null;
  console.log(
    JSON.stringify({
      status: "DEMAND_EXTRACTED",
      source: d.source,
      lead_id: d.leadId,
      extraction: rec.status,
      known_fields: knownFields(rec.demand).length,
      core_complete: isCoreComplete(rec.demand),
      saved: saved.ok,
      ...(saved.error ? { error: saved.error } : {}),
      ...(match ? { matching: match.ok ? "ok" : match.reason, matches_written: match.written } : {}),
    }),
  );
}
