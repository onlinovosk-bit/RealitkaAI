/**
 * C4 proof — K3 eval JSON fixtures satisfy production ListingContent
 * (required snake_case keys + optional K5 fields). No mapper.
 *
 * Fixtures: tests/verification/fixtures/listing-c4/*.json
 * Type SoT: src/lib/ai/listing-content.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ListingContent } from "@/lib/ai/listing-content";

const FIXTURE_DIR = join(__dirname, "fixtures", "listing-c4");

const REQUIRED_KEYS = [
  "portal_text",
  "fb_ad_copy",
  "ig_caption",
  "email_subject",
  "email_body",
  "seo_keywords",
] as const;

const OPTIONAL_KEYS = [
  "titles",
  "missingData",
  "recommendations",
  "techniquesUsed",
] as const;

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, name), "utf8"));
}

function assertListingContent(raw: unknown): asserts raw is ListingContent {
  expect(raw).toBeTypeOf("object");
  expect(raw).not.toBeNull();
  const obj = raw as Record<string, unknown>;

  for (const key of REQUIRED_KEYS) {
    expect(obj, `missing required key ${key}`).toHaveProperty(key);
  }

  expect(typeof obj.portal_text).toBe("string");
  expect((obj.portal_text as string).length).toBeGreaterThan(0);
  expect(typeof obj.fb_ad_copy).toBe("string");
  expect(typeof obj.ig_caption).toBe("string");
  expect(typeof obj.email_subject).toBe("string");
  expect(typeof obj.email_body).toBe("string");
  expect(Array.isArray(obj.seo_keywords)).toBe(true);
  expect((obj.seo_keywords as unknown[]).every((k) => typeof k === "string")).toBe(true);
  expect((obj.seo_keywords as string[]).length).toBe(6);

  // Forbidden legacy K5-only keys (no mapper)
  expect(obj).not.toHaveProperty("mainText");
  expect(obj).not.toHaveProperty("socialText");

  if ("titles" in obj && obj.titles !== undefined) {
    expect(Array.isArray(obj.titles)).toBe(true);
    expect((obj.titles as unknown[]).length).toBe(3);
    expect((obj.titles as unknown[]).every((t) => typeof t === "string")).toBe(true);
  }
  if ("missingData" in obj && obj.missingData !== undefined) {
    expect(Array.isArray(obj.missingData)).toBe(true);
    expect((obj.missingData as unknown[]).every((t) => typeof t === "string")).toBe(true);
  }
  if ("recommendations" in obj && obj.recommendations !== undefined) {
    expect(Array.isArray(obj.recommendations)).toBe(true);
    expect((obj.recommendations as unknown[]).every((t) => typeof t === "string")).toBe(true);
  }
  if ("techniquesUsed" in obj && obj.techniquesUsed !== undefined) {
    expect(Array.isArray(obj.techniquesUsed)).toBe(true);
    expect((obj.techniquesUsed as unknown[]).every((n) => typeof n === "number")).toBe(true);
  }

  // Compile-time + runtime: shape matches ListingContent
  const _typed: ListingContent = obj as unknown as ListingContent;
  expect(_typed.portal_text).toBeTruthy();
  void OPTIONAL_KEYS;
}

const FIXTURES = readdirSync(FIXTURE_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

describe("[verification] C4 ListingContent schema (K3 fixtures)", () => {
  it("has exactly 6 fixtures (T1–T6)", () => {
    expect(FIXTURES).toEqual([
      "t1-sabinov.json",
      "t2-terakovce.json",
      "t3-lubotice.json",
      "t4-modra.json",
      "t5-stress-empty.json",
      "t6-stress-ba.json",
    ]);
  });

  for (const file of FIXTURES) {
    it(`${file} satisfies ListingContent`, () => {
      const raw = loadFixture(file);
      assertListingContent(raw);
      // TypeScript structural check via satisfies in assignment
      const content = raw as ListingContent;
      const check: ListingContent = {
        portal_text: content.portal_text,
        fb_ad_copy: content.fb_ad_copy,
        ig_caption: content.ig_caption,
        email_subject: content.email_subject,
        email_body: content.email_body,
        seo_keywords: content.seo_keywords,
        titles: content.titles,
        missingData: content.missingData,
        recommendations: content.recommendations,
        techniquesUsed: content.techniquesUsed,
      };
      expect(check.seo_keywords).toHaveLength(6);
    });
  }
});
