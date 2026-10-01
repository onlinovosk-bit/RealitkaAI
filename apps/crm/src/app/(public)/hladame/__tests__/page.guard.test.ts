import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src/app/(public)/hladame/page.tsx");

describe("hladame page guards", () => {
  it("filters Dopyt transaction and scopes by agency_id", () => {
    const src = readFileSync(SRC, "utf8");
    expect(src).toContain("REALVIA_TRANSACTION_DEMAND");
    expect(src).toContain('.eq("agency_id", agencyId)');
    expect(src).toContain('.eq("transaction_type", REALVIA_TRANSACTION_DEMAND)');
    expect(src).toContain("dopyt=");
  });

  it("does not invent budget copy for zero price", () => {
    const src = readFileSync(SRC, "utf8");
    expect(src).toContain("if (!(price > 0)) return null");
    expect(src).not.toMatch(/dohodou/i);
  });

  it("fail-closed when agency missing", () => {
    const src = readFileSync(SRC, "utf8");
    expect(src).toContain("!agencyId");
    expect(src).toContain("Ponuky momentálne nie sú dostupné");
  });
});
