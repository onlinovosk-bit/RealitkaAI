import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("CEO Command anti-fiction guard", () => {
  it("keeps pending predictions explicit and avoids fake percentages", () => {
    const source = readFileSync(
      join(CRM_ROOT, "src/lib/ceo-command/summary.ts"),
      "utf8",
    );

    expect(source).toContain("Predikcia obratu/provízií");
    expect(source).toContain("status: \"pending\"");

    const forbidden = [
      "pravdepodobnosť uzavretia",
      "73%",
      "TOP klient",
      "garantovaný obrat",
    ];

    for (const token of forbidden) {
      expect(source.toLowerCase()).not.toContain(token.toLowerCase());
    }
  });
});

