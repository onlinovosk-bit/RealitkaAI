import { describe, it, expect } from "vitest";
import {
  LISTING_VARIANT_KEYS,
  LISTING_VARIANTS,
  buildVariantsPrompt,
  normalizeVariants,
} from "@/lib/ai/listing-variants";
import { computePrimaryVariant } from "@/lib/listings/generations-store";

const PROPERTY = {
  type: "3-izbový byt", location: "Prešov", district: "Sídlisko III",
  size_m2: 72, price: 165000, condition: "pôvodný stav",
  features: ["balkón", "pivnica"], agent_notes: "Bez výťahu, 4. poschodie.",
};

describe("listing variants", () => {
  it("má štyri varianty a každý má label, hint aj bestFor", () => {
    expect(LISTING_VARIANT_KEYS).toEqual(["conversion", "facts", "story", "honest"]);
    for (const k of LISTING_VARIANT_KEYS) {
      expect(LISTING_VARIANTS[k].label.length).toBeGreaterThan(3);
      expect(LISTING_VARIANTS[k].hint.length).toBeGreaterThan(10);
      expect(LISTING_VARIANTS[k].bestFor.length).toBeGreaterThan(10);
    }
  });

  it("prompt obsahuje parametre nehnuteľnosti aj inštrukciu pre každý variant", () => {
    const p = buildVariantsPrompt(PROPERTY, "FAMILY");
    expect(p).toContain("3-izbový byt");
    expect(p).toContain("Prešov");
    expect(p).toContain("Bez výťahu");
    for (const k of LISTING_VARIANT_KEYS) expect(p).toContain(k);
    // rodinná persona sa musí preniesť
    expect(p.toLowerCase()).toContain("rodina");
  });

  it("prompt zakazuje vymýšľanie faktov — kľúčové pre 'čestný' variant", () => {
    const p = buildVariantsPrompt(PROPERTY);
    expect(p).toContain("NIKDY si nevymýšľaj chybu");
    expect(p).toContain("nedomýšľaj");
  });

  it("prompt žiada, aby sa varianty nepodobali", () => {
    expect(buildVariantsPrompt(PROPERTY)).toContain("NESMÚ podobať");
  });

  it("normalizeVariants doplní chýbajúce varianty — UI nesmie spadnúť na neúplnom JSON", () => {
    const v = normalizeVariants({ conversion: { portal_text: "x" } as never });
    expect(Object.keys(v).sort()).toEqual([...LISTING_VARIANT_KEYS].sort());
    expect(v.conversion.portal_text).toBe("x");
    expect(v.story.portal_text).toBe("");
    expect(v.honest.seo_keywords).toEqual([]);
  });
});

describe("computePrimaryVariant", () => {
  it("vráti najčastejšie zvolený variant", () => {
    expect(
      computePrimaryVariant({ portal_text: "story", fb_ad_copy: "story", email_body: "facts" }),
    ).toBe("story");
  });
  it("null pri prázdnom výbere", () => {
    expect(computePrimaryVariant(null)).toBeNull();
    expect(computePrimaryVariant({})).toBeNull();
  });
});
