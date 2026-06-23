import { describe, expect, it } from "vitest";
import { buildGuardianPropertyEditHref } from "@/lib/capabilities/quality-guardian/property-edit-href";

describe("buildGuardianPropertyEditHref", () => {
  it("includes source_id in URL, not bare /properties", () => {
    const href = buildGuardianPropertyEditHref("13303557");
    expect(href).toContain("source_id=13303557");
    expect(href).toContain("edit=1");
    expect(href).not.toBe("/properties");
  });

  it("encodes special characters in source_id", () => {
    const href = buildGuardianPropertyEditHref("abc/def");
    expect(href).toContain("source_id=abc%2Fdef");
  });

  it("falls back to /properties when sourceId is empty", () => {
    expect(buildGuardianPropertyEditHref("")).toBe("/properties");
    expect(buildGuardianPropertyEditHref("   ")).toBe("/properties");
  });
});
