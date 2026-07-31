import { describe, expect, it } from "vitest";

import {
  LISTING_OUTPUT_SCHEMA_VERSION,
  ListingOutputSchema,
  parseListingOutput,
} from "@/lib/ai/schemas/listing-output";
import {
  LISTING_PROMPT_VERSION,
  listingPromptHash,
} from "@/lib/ai/prompts/listing-prompt";

const validOutput = {
  headline_variants: ["Byt Ružinov 3i", "Domov pri parku", "189 000 € · 89 m²"],
  portal_description: "Ranné svetlo dopadá do obývacej izby s balkónom na juh.",
  social_description: "3-izbový byt v Ružinove — tichá ulica, 5 min pešo od MHD.",
  missing_information: ["Rok rekonštrukcie kúpeľne"],
  buyer_personas: [{ group: "Mladá rodina", reason: "Blízko škôlky a parku." }],
  objection_handling: [
    {
      weakness: "pôvodný stav kúpeľne",
      customer_objection: "Potrebujem rekonštrukciu.",
      response: "Cena zohľadňuje stav.",
      reframing: "Vlastná rekonštrukcia podľa vkusu.",
    },
  ],
  seo_keywords: ["byt Ružinov", "3 izby Bratislava"],
  quality_score: {
    overall: 82,
    completeness: 70,
    credibility: 88,
    marketing: 85,
    seo: 75,
  },
  cta: "Zavolajte Petrovi: 0900 123 456",
};

describe("ListingOutputSchema SSOT", () => {
  it("accepts valid output", () => {
    expect(parseListingOutput(validOutput)).toEqual(validOutput);
  });

  it("rejects invalid JSON — wrong headline count", () => {
    expect(() =>
      ListingOutputSchema.parse({ ...validOutput, headline_variants: ["a", "b"] }),
    ).toThrow();
  });

  it("quality_score segments are 0–100", () => {
    expect(() =>
      ListingOutputSchema.parse({
        ...validOutput,
        quality_score: { ...validOutput.quality_score, seo: 101 },
      }),
    ).toThrow();
    expect(() =>
      ListingOutputSchema.parse({
        ...validOutput,
        quality_score: { ...validOutput.quality_score, credibility: -1 },
      }),
    ).toThrow();
  });

  it("objection_handling requires all four fields", () => {
    expect(() =>
      ListingOutputSchema.parse({
        ...validOutput,
        objection_handling: [{ weakness: "x", customer_objection: "y" }],
      }),
    ).toThrow();
  });

  it("schema_version constant is stable", () => {
    expect(LISTING_OUTPUT_SCHEMA_VERSION).toBe("listing_output_v1");
  });

  it("prompt_hash differs from prompt_version", () => {
    expect(listingPromptHash()).not.toBe(LISTING_PROMPT_VERSION);
    expect(listingPromptHash()).toMatch(/^[a-f0-9]{32}$/);
  });
});
