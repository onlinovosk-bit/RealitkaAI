import type { EnrichmentInputRecord } from "@/lib/enrichment";
import { enrichRecordWaterfall } from "@/lib/enrichment";

export async function webFetchStub(query: string): Promise<{ query: string; status: "stubbed"; snippets: string[] }> {
  return {
    query,
    status: "stubbed",
    snippets: [
      "Web fetch tool is stubbed in PoC.",
      "Replace with real fetch/search provider in production.",
    ],
  };
}

export async function enrichmentTool(record: EnrichmentInputRecord) {
  return enrichRecordWaterfall({
    record,
    persistAudit: true,
  });
}
