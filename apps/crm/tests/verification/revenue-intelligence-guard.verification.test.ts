import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("Revenue intelligence anti-hallucination guard", () => {
  it("does not render forbidden fake metrics in RevenueView", () => {
    const source = readFileSync(
      join(CRM_ROOT, "src/components/dashboard/RevenueView.tsx"),
      "utf8",
    );

    const forbidden = [
      "94.8%",
      "1,42M €",
      "9 Alerts",
      "88.4ms response",
      "smoke testy",
    ];

    for (const token of forbidden) {
      expect(source.toLowerCase()).not.toContain(token.toLowerCase());
    }
  });
});
