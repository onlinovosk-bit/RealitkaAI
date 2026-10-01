import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

describe("[verification] Realvia honest unknown mapping", () => {
  it("map-taxonomy uses Neznáme fallback — not Ostatné/Predaj fog", () => {
    const src = read("src/lib/realvia/map-taxonomy.ts");
    expect(src).toContain('REALVIA_MAPPING_UNKNOWN = "Neznáme"');
    expect(src).toContain("?? REALVIA_MAPPING_UNKNOWN");
    expect(src).not.toMatch(/\?\?\s*['\"]Ostatné['\"]/);
    expect(src).not.toMatch(/\?\?\s*['\"]Predaj['\"]/);
  });

  it("disputed Dom inventing on 13/14 is gone — official číselník maps them to Byt", () => {
    const src = read("src/lib/realvia/map-taxonomy.ts");
    expect(src).not.toMatch(/\b13\s*:\s*['\"]Dom['\"]/);
    expect(src).not.toMatch(/\b14\s*:\s*['\"]Dom['\"]/);
    expect(src).toMatch(/\b13\s*:\s*['\"]Byt['\"]/);
    expect(src).toMatch(/\b14\s*:\s*['\"]Byt['\"]/);
  });

  it("transaction 123 is Prenájom (not invented Predaj); 124 Podnájom; 125 Výmena", () => {
    const src = read("src/lib/realvia/map-taxonomy.ts");
    expect(src).not.toMatch(/\b123\s*:\s*['\"]Predaj['\"]/);
    expect(src).toMatch(/\b123\s*:\s*['\"]Prenájom['\"]/);
    expect(src).toMatch(/\b124\s*:\s*['\"]Podnájom['\"]/);
    expect(src).toMatch(/\b125\s*:\s*['\"]Výmena['\"]/);
    expect(src).not.toMatch(/\b125\s*:\s*['\"]Dražba['\"]/);
  });

  it("processQueue delegates to map-taxonomy (no local fog fallback)", () => {
    const src = read("src/lib/realvia/processQueue.ts");
    expect(src).toContain("map-taxonomy");
    expect(src).not.toMatch(/function mapCategory/);
    expect(src).not.toMatch(/function mapTransaction/);
  });

  it("quality guardian flags Neznáme type/transaction as unverified", () => {
    const src = read("src/lib/capabilities/quality-guardian/review.ts");
    expect(src).toContain("unverified_property_type");
    expect(src).toContain("unverified_transaction_type");
    expect(src).toContain("isRealviaMappingUnknown");
  });
});
