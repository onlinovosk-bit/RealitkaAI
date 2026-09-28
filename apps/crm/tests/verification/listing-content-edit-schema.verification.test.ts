/**
 * PATCH /api/ai/listing-content/generations/:id must preserve C4 optional fields.
 *
 * Regression: editSchema only allowed the 6 required ListingContent keys.
 * Zod strips unknown keys → titles / missingData / recommendations / techniquesUsed
 * were silently dropped whenever ListingGeneratorClient saved an edit
 * (it POSTs the full in-memory `content` object).
 *
 * effectiveContent() prefers edited_output → draft reload lost those fields.
 */
import { describe, expect, it } from "vitest";
import { listingContentEditSchema } from "@/app/api/ai/listing-content/generations/[id]/route";
import type { ListingContent } from "@/lib/ai/listing-content";
import { effectiveContent } from "@/lib/listings/generations-store";

const fullContent: ListingContent = {
  portal_text: "Portal text upravený maklérom.",
  fb_ad_copy: "FB copy",
  ig_caption: "IG caption",
  email_subject: "Subject",
  email_body: "Body",
  seo_keywords: ["poprad", "byt"],
  titles: [
    "3-izbový byt Poprad — titulok portál",
    "Titulok social",
    "Alternatívny uhol",
  ],
  missingData: ["Orientácia okien"],
  recommendations: ["Doplň školu v pešej dostupnosti ak overené"],
  techniquesUsed: [1, 4, 7],
};

describe("listing-content edit schema preserves C4 optionals", () => {
  it("keeps titles / missingData / recommendations / techniquesUsed after parse", () => {
    const parsed = listingContentEditSchema.safeParse(fullContent);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.titles).toEqual(fullContent.titles);
    expect(parsed.data.missingData).toEqual(fullContent.missingData);
    expect(parsed.data.recommendations).toEqual(fullContent.recommendations);
    expect(parsed.data.techniquesUsed).toEqual(fullContent.techniquesUsed);
    expect(parsed.data.portal_text).toBe(fullContent.portal_text);
  });

  it("still accepts required-only payloads (optionals omitted)", () => {
    const { titles: _t, missingData: _m, recommendations: _r, techniquesUsed: _u, ...required } =
      fullContent;
    const parsed = listingContentEditSchema.safeParse(required);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.titles).toBeUndefined();
  });

  it("effectiveContent after edit keeps C4 fields from edited_output", () => {
    const parsed = listingContentEditSchema.parse(fullContent);
    const content = effectiveContent({
      id: "gen-1",
      agencyId: "agency-1",
      persona: "GENERAL",
      input: {
        type: "3-izbový byt",
        location: "Poprad",
        size_m2: 70,
        price: 165000,
        condition: "po rekonštrukcii",
        features: [],
      },
      output: {
        ...fullContent,
        portal_text: "Pôvodný AI text",
        titles: ["AI title 1", "AI title 2", "AI title 3"],
      },
      editedOutput: parsed,
      status: "edited",
      createdAt: "2026-08-13T00:00:00.000Z",
      updatedAt: "2026-08-13T00:00:00.000Z",
    });

    expect(content?.titles).toEqual(fullContent.titles);
    expect(content?.missingData).toEqual(fullContent.missingData);
    expect(content?.portal_text).toBe(fullContent.portal_text);
  });
});
