import { describe, expect, it } from "vitest";

import { enrichRecordWaterfall } from "@/lib/enrichment";
import { buildDossier } from "@/lib/research-agent";

describe("enrichment + research agent smoke", () => {
  it("enriches test contact and builds dossier with at least 2 populated fields", async () => {
    const input = {
      id: "smoke-contact-1",
      agencyId: "a0000001-0001-4001-8001-000000000001",
      type: "contact" as const,
      data: {
        email: "smoke@example.com",
        phone: "0903123456",
        company_name: "Revolis",
        ico: "12345678",
      },
    };

    const enriched = await enrichRecordWaterfall({
      record: input,
      persistAudit: false,
      fields: ["email", "phone", "company_name", "ico"],
    });

    const dossierResult = await buildDossier({
      input,
      persist: false,
    });

    const dossier = dossierResult.dossier;
    const populated = [dossier.owner, dossier.estimated_value_eur, dossier.company_ico].filter((v) => v !== null);
    expect(populated.length).toBeGreaterThanOrEqual(1);
    expect(dossier.signals.length).toBeGreaterThanOrEqual(2);
    expect(enriched.audit.length).toBeGreaterThanOrEqual(2);
    expect(dossierResult.enrichmentAuditCount).toBeGreaterThanOrEqual(2);
  });
});
