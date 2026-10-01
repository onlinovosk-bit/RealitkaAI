import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: vi.fn(() => null),
}));

vi.mock("@/lib/ai/openai", () => ({
  getOpenAIClient: vi.fn(() => null),
  callOpenAI: vi.fn(),
}));

import { enrichRecordWaterfall } from "@/lib/enrichment";
import { buildDossier } from "@/lib/research-agent";

const RPO_FIXTURE = JSON.parse(
  readFileSync(
    join(process.cwd(), "src/lib/enrichment/__tests__/fixtures/rpo2-organization-50158635.json"),
    "utf8",
  ),
) as unknown;

describe("enrichment + research agent smoke", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("rpo2/organizations")) {
        return new Response(JSON.stringify(RPO_FIXTURE), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return originalFetch(input);
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it(
    "enriches test contact and builds dossier with at least 2 populated fields",
    async () => {
      const input = {
        id: "smoke-lead-1",
        agencyId: "a0000001-0001-4001-8001-000000000001",
        type: "lead" as const,
        data: {
          email: "smoke@example.com",
          phone: "0903123456",
          location: "Humenné",
          price: 125000,
          company_name: "Slovensko.Digital",
          ico: "50158635",
        },
      };

      const enriched = await enrichRecordWaterfall({
        record: input,
        persistAudit: false,
        fields: ["email", "phone", "location", "company_name", "ico", "company_profile"],
      });

      const dossierResult = await buildDossier({
        input,
        persist: false,
      });

      const dossier = dossierResult.dossier;
      const populated = [dossier.owner, dossier.estimated_value_eur, dossier.company_ico].filter(
        (v) => v !== null,
      );
      expect(populated.length).toBeGreaterThanOrEqual(2);
      expect(dossier.signals.length).toBeGreaterThanOrEqual(2);
      expect(enriched.audit.length).toBeGreaterThanOrEqual(2);
      expect(dossierResult.enrichmentAuditCount).toBeGreaterThanOrEqual(2);
    },
    15_000,
  );
});
