import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

/**
 * Live spec: Realvia worker must never upsert/delete by source_id alone.
 * Schema uniqueness is (agency_id, source_system, source_id).
 */
describe("verification: realvia agency-scoped source_id", () => {
  it("processAdvertPayload scopes existence lookup by agency_id + source_system + source_id", () => {
    const src = read("src/lib/realvia/processQueue.ts");
    expect(src).toContain(".eq('agency_id', tenantAgencyId)");
    expect(src).toContain(".eq('source_system', 'realvia')");
    expect(src).toContain(".eq('source_id', sourceId)");
    // Must not force PK = Realvia source_id (cross-tenant collision).
    expect(src).not.toContain("propertyData.id = sourceId");
  });

  it("processDeletePayload scopes soft-delete by agency_id", () => {
    const src = read("src/lib/realvia/processQueue.ts");
    const deleteFn = src.slice(src.indexOf("export async function processDeletePayload"));
    expect(deleteFn).toContain(".eq('agency_id', tenantAgencyId)");
    expect(deleteFn).toContain(".eq('source_system', 'realvia')");
    expect(deleteFn).toContain(".eq('source_id', sourceIdStr)");
  });
});
