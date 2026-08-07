/**
 * PR-A proof — SYSTEM_PROMPT is FINAL (C4 ListingContent schema, E1/E2).
 * Twin doc: docs/prompts/listing-generator-system-prompt-FINAL.md
 */
import { describe, expect, it } from "vitest";
import { SYSTEM_PROMPT } from "@/lib/ai/listing-content";

describe("[verification] listing SYSTEM_PROMPT FINAL wire (PR-A)", () => {
  it("exports non-empty FINAL system prompt", () => {
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(10_000);
  });

  it("requires production ListingContent keys (C4, no mapper)", () => {
    for (const key of [
      "portal_text",
      "fb_ad_copy",
      "ig_caption",
      "email_subject",
      "email_body",
      "seo_keywords",
      "titles",
      "missingData",
      "recommendations",
      "techniquesUsed",
    ]) {
      expect(SYSTEM_PROMPT, `missing key ${key}`).toContain(`"${key}"`);
    }
    expect(SYSTEM_PROMPT).not.toContain("mainText");
    expect(SYSTEM_PROMPT).not.toContain("socialText");
  });

  it("encodes E1 charakterLokality + E2 portal_text range", () => {
    expect(SYSTEM_PROMPT).toContain("charakterLokality");
    expect(SYSTEM_PROMPT).toMatch(/220–320|220-320/);
  });

  it("forbids empty adjectives and invented locality character", () => {
    expect(SYSTEM_PROMPT).toContain("ZÁKAZ PRÁZDNYCH PRÍDAVNÝCH");
    expect(SYSTEM_PROMPT).toContain(
      "Žiadna charakterizácia povahy lokality mimo poľa charakterLokality",
    );
  });
});
