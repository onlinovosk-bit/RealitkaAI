import { describe, expect, it } from "vitest";
import { stripHtmlToPlainText } from "@/lib/capabilities/_shared/strip-html";

describe("stripHtmlToPlainText", () => {
  it("removes tags and keeps readable text", () => {
    const raw = "ACH077D<br />Reality Smolko ponúka <strong>novostavbu</strong>.";
    expect(stripHtmlToPlainText(raw)).toBe(
      "ACH077D Reality Smolko ponúka novostavbu.",
    );
  });

  it("handles empty input", () => {
    expect(stripHtmlToPlainText("")).toBe("");
  });
});
