import { callOpenAI, getOpenAIClient } from "@/lib/ai/openai";
import type { EnrichmentInputRecord } from "@/lib/enrichment";
import { createServiceRoleClient } from "@/lib/supabase/admin";

import { dossierSchema, type Dossier } from "./schema";
import { enrichmentTool, webFetchStub } from "./tools";

function buildNullReasons(dossier: Partial<Dossier>): Record<string, string> {
  const reasons: Record<string, string> = {};
  if (dossier.owner == null) reasons.owner = "No verified owner from enrichment/web sources.";
  if (dossier.estimated_value_eur == null) reasons.estimated_value_eur = "No valuation signal available.";
  if (dossier.company_ico == null) reasons.company_ico = "No company identifier found.";
  return reasons;
}

function composeDeterministicDossier(input: EnrichmentInputRecord, enrichedData: Record<string, unknown>): Dossier {
  const ownerRaw = enrichedData.owner_name ?? enrichedData.company_name;
  const owner =
    typeof ownerRaw === "string" && ownerRaw.trim().length
      ? ownerRaw.trim()
      : ownerRaw && typeof ownerRaw === "object" && "company_name" in ownerRaw
        ? String((ownerRaw as Record<string, unknown>).company_name ?? "").trim() || null
        : null;
  const priceRaw = enrichedData.price;
  const estimatedValue =
    typeof priceRaw === "number"
      ? priceRaw
      : typeof priceRaw === "string" && Number.isFinite(Number(priceRaw))
        ? Number(priceRaw)
        : null;
  const icoRaw = enrichedData.ico;
  const companyIco =
    typeof icoRaw === "string" && icoRaw.trim()
      ? icoRaw.trim()
      : icoRaw && typeof icoRaw === "object" && "ico" in icoRaw
        ? String((icoRaw as Record<string, unknown>).ico ?? "").trim() || null
        : null;

  const signals = [
    owner ? { label: "owner_resolved", confidence: 0.5, source: "enrichment" } : null,
    estimatedValue ? { label: "estimated_value_from_input", confidence: 0.6, source: "input" } : null,
    companyIco ? { label: "company_ico_detected", confidence: 0.7, source: "enrichment" } : null,
  ].filter(Boolean) as Dossier["signals"];

  const partial: Partial<Dossier> = {
    owner,
    estimated_value_eur: estimatedValue,
    company_ico: companyIco,
    risk_flags: [],
    signals,
    sources: ["enrichment-engine", "web-fetch-stub"],
  };

  return dossierSchema.parse({
    ...partial,
    null_reasons: buildNullReasons(partial),
  });
}

async function maybeOpenAIDossier(params: {
  input: EnrichmentInputRecord;
  deterministic: Dossier;
  webNotes: Awaited<ReturnType<typeof webFetchStub>>;
}): Promise<Dossier> {
  if (!getOpenAIClient()) return params.deterministic;
  const prompt = [
    "You are a conservative research assistant for real-estate CRM.",
    "Never hallucinate. If unsupported, keep value null and explain in null_reasons.",
    "Return strict JSON only following schema keys exactly.",
    "",
    `Input: ${JSON.stringify(params.input.data)}`,
    `Deterministic dossier seed: ${JSON.stringify(params.deterministic)}`,
    `Web tool output: ${JSON.stringify(params.webNotes)}`,
  ].join("\n");

  try {
    const result = await callOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      tag: "research-agent",
    });
    const parsed = JSON.parse(result.content);
    return dossierSchema.parse(parsed);
  } catch {
    return params.deterministic;
  }
}

async function persistDossier(params: {
  agencyId: string;
  recordId: string;
  dossier: Dossier;
  recordType: EnrichmentInputRecord["type"];
}): Promise<void> {
  if (params.recordType !== "contact") return;
  const sb = createServiceRoleClient();
  if (!sb) return;
  const { error } = await sb
    .from("contacts")
    .update({ dossier: params.dossier })
    .eq("id", params.recordId)
    .eq("agency_id", params.agencyId);
  if (error) {
    throw new Error(`[research-agent] contacts.dossier update failed: ${error.message}`);
  }
}

export async function buildDossier(params: {
  input: EnrichmentInputRecord;
  persist?: boolean;
}): Promise<{ dossier: Dossier; enrichmentAuditCount: number }> {
  const enriched = await enrichmentTool(params.input);
  const web = await webFetchStub(`record:${params.input.id}`);
  const deterministic = composeDeterministicDossier(params.input, enriched.enrichedRecord);
  const dossier = await maybeOpenAIDossier({
    input: params.input,
    deterministic,
    webNotes: web,
  });

  if (params.persist !== false) {
    await persistDossier({
      agencyId: params.input.agencyId,
      recordId: params.input.id,
      dossier,
      recordType: params.input.type,
    });
  }

  return {
    dossier,
    enrichmentAuditCount: enriched.audit.length,
  };
}
