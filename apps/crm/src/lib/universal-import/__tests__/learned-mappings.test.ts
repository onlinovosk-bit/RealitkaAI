import { describe, expect, it } from "vitest";
import { applyLearnedMappings } from "@/lib/universal-import/learned-mappings";
import type { DetectedColumn } from "@/lib/universal-import/types";

describe("applyLearnedMappings", () => {
  const baseColumns: DetectedColumn[] = [
    {
      originalHeader: "Meno",
      target: "skip",
      confidence: 0,
      source: "auto",
      sampleValues: ["Ján"],
    },
    {
      originalHeader: "Mobil",
      target: "phone",
      confidence: 0.95,
      source: "auto",
      sampleValues: ["0903123456"],
    },
  ];

  it("overrides auto detection with learned mapping", () => {
    const result = applyLearnedMappings(baseColumns, {
      Meno: "contact_name",
      Mobil: "phone",
    });

    expect(result[0].target).toBe("contact_name");
    expect(result[0].source).toBe("learned");
    expect(result[0].confidence).toBe(0.99);
    expect(result[1].source).toBe("learned");
  });

  it("leaves unmatched columns unchanged", () => {
    const result = applyLearnedMappings(baseColumns, { Meno: "contact_name" });
    expect(result[1].source).toBe("auto");
  });
});
