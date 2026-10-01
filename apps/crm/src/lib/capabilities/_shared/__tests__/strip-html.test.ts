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

  it("converts named HTML entities", () => {
    expect(stripHtmlToPlainText("cena &amp; podmienky &lt;bez tagov&gt;")).toBe(
      "cena & podmienky <bez tagov>",
    );
  });

  it("collapses multiple whitespace after stripping", () => {
    const raw = "<p>Riadok 1.</p>   <p>Riadok 2.</p>";
    const result = stripHtmlToPlainText(raw);
    expect(result).not.toMatch(/\s{2,}/);
    expect(result).toContain("Riadok 1.");
    expect(result).toContain("Riadok 2.");
  });

  it("returns plain text unchanged", () => {
    const plain = "Byt na predaj, 76 m², Modrá nad Cirochou.";
    expect(stripHtmlToPlainText(plain)).toBe(plain);
  });
});
