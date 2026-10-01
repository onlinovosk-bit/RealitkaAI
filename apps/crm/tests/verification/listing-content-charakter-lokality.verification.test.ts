/**
 * PR-B / E1 — charakterLokality optional input → user prompt wire.
 * Empty = no locality-character line; filled = enum and/or free text in context.
 */
import { describe, expect, it } from "vitest";
import {
  buildListingUserPrompt,
  CHARAKTER_LOKALITY_KINDS,
  formatCharakterLokalityLine,
  sanitizePropertyInput,
  type PropertyInput,
} from "@/lib/ai/listing-content";

const BASE: PropertyInput = {
  type: "3-izbový byt",
  location: "Sabinov",
  size_m2: 68,
  price: 129_000,
  condition: "po rekonštrukcii",
  features: ["balkón"],
};

describe("[verification] charakterLokality E1 wire (PR-B)", () => {
  it("exposes brief enum set (malé mesto … iné + satelit)", () => {
    expect(CHARAKTER_LOKALITY_KINDS).toEqual([
      "malé mesto",
      "sídlisko",
      "vidiek",
      "centrum",
      "satelit",
      "iné",
    ]);
  });

  it("omits Charakter lokality line when field empty (E1: no invented povaha)", () => {
    expect(formatCharakterLokalityLine(undefined)).toBeNull();
    expect(formatCharakterLokalityLine({})).toBeNull();
    expect(formatCharakterLokalityLine({ kind: undefined, text: "  " })).toBeNull();

    const prompt = buildListingUserPrompt(BASE);
    expect(prompt).not.toContain("Charakter lokality");
    expect(prompt).toContain("Lokalita: Sabinov");
  });

  it("includes kind and/or free text in user prompt when provided", () => {
    const kindOnly = buildListingUserPrompt({
      ...BASE,
      charakterLokality: { kind: "malé mesto" },
    });
    expect(kindOnly).toContain("Charakter lokality (E1): malé mesto");

    const textOnly = buildListingUserPrompt({
      ...BASE,
      charakterLokality: { text: "Sabinov nie je Prešov" },
    });
    expect(textOnly).toContain("Charakter lokality (E1): Sabinov nie je Prešov");

    const both = buildListingUserPrompt({
      ...BASE,
      charakterLokality: {
        kind: "sídlisko",
        text: "pokojná panelová lokalita",
      },
    });
    expect(both).toContain(
      "Charakter lokality (E1): sídlisko — pokojná panelová lokalita",
    );
  });

  it("sanitizePropertyInput drops empty charakterLokality (non-breaking optional)", () => {
    const cleaned = sanitizePropertyInput({
      ...BASE,
      charakterLokality: { text: "   " },
    });
    expect(cleaned.charakterLokality).toBeUndefined();

    const kept = sanitizePropertyInput({
      ...BASE,
      charakterLokality: { kind: "centrum", text: " pešia zóna " },
    });
    expect(kept.charakterLokality).toEqual({
      kind: "centrum",
      text: "pešia zóna",
    });
  });
});
