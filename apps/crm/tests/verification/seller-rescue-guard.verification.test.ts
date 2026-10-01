import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("Seller Rescue anti-hallucination guard", () => {
  it("keeps honest empty state and avoids fake metrics payload", () => {
    const source = readFileSync(
      join(CRM_ROOT, "src/app/api/cron/seller-rescue/route.ts"),
      "utf8",
    );

    expect(source).toContain("Žiadne leady bez kontaktu nad");

    const forbidden = [
      "pravdepodobnosť uzavretia",
      "73%",
      "TOP klient",
      "Martin Kováč",
      "Simona Vargová",
    ];

    for (const token of forbidden) {
      expect(source.toLowerCase()).not.toContain(token.toLowerCase());
    }
  });
});

