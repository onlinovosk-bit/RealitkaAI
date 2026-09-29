import { describe, expect, it } from "vitest";
import { sanitizeText } from "../sanitize";

describe("sanitizeText — Slovak phone numbers", () => {
  it.each(["0903 123 456", "0903123456", "0903-123-456", "+421 903 123 456", "+421903123456"])(
    "masks %s",
    (phone) => {
      const { sanitized } = sanitizeText(`Volajte na ${phone}, ďakujem.`);
      expect(sanitized).not.toContain(phone);
      expect(sanitized).toMatch(/\[PHONE_1\]/);
    },
  );

  it("does not mask prices or areas", () => {
    const text = "Rozpočet do 250 000 €, byt 68 m2, 3 izby.";
    expect(sanitizeText(text).sanitized).toBe(text);
  });
});
