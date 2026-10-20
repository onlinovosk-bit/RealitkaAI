import { describe, expect, it } from "vitest";
import {
  PHOTO_FACT_RULES,
  assertTenantPhotoUrls,
  buildListingFromPhotosUserPrompt,
  extractPropertyImageUrls,
  generateListingContentFromPhotos,
  isBlockedPhotoHost,
  validatePhotoRequests,
} from "../listing-from-photos";
import { createMockListingVisionProvider } from "../listing-vision-provider";
import { isListingFromPhotosEnabled } from "../listing-from-photos-flag";
import type { PropertyInput } from "../listing-content";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const property: PropertyInput = {
  type: "3-izbový byt",
  location: "Prešov",
  size_m2: 72,
  price: 149_000,
  condition: "po rekonštrukcii",
  features: ["balkón"],
};

describe("isListingFromPhotosEnabled", () => {
  it("is off unless LISTING_FROM_PHOTOS_V0 is exactly 1", () => {
    const prev = process.env.LISTING_FROM_PHOTOS_V0;
    delete process.env.LISTING_FROM_PHOTOS_V0;
    expect(isListingFromPhotosEnabled()).toBe(false);
    process.env.LISTING_FROM_PHOTOS_V0 = "true";
    expect(isListingFromPhotosEnabled()).toBe(false);
    process.env.LISTING_FROM_PHOTOS_V0 = "1";
    expect(isListingFromPhotosEnabled()).toBe(true);
    if (prev === undefined) delete process.env.LISTING_FROM_PHOTOS_V0;
    else process.env.LISTING_FROM_PHOTOS_V0 = prev;
  });
});

describe("validatePhotoRequests", () => {
  it("accepts a small png data URL", () => {
    const result = validatePhotoRequests([{ type: "data_url", dataUrl: TINY_PNG }]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.photos).toHaveLength(1);
      expect(result.photos[0]?.source).toBe("base64");
    }
  });

  it("rejects empty, too many, and private hosts", () => {
    expect(validatePhotoRequests([]).ok).toBe(false);
    expect(
      validatePhotoRequests(
        Array.from({ length: 7 }, () => ({ type: "data_url" as const, dataUrl: TINY_PNG })),
      ).ok,
    ).toBe(false);
    expect(validatePhotoRequests([{ type: "url", url: "ftp://x.test/a.jpg" }]).ok).toBe(false);
    const local = validatePhotoRequests([{ type: "url", url: "https://127.0.0.1/a.jpg" }]);
    expect(local.ok).toBe(false);
    const okUrl = validatePhotoRequests([{ type: "url", url: "https://cdn.example.test/a.jpg" }]);
    expect(okUrl.ok).toBe(true);
  });
});

describe("tenant photo URLs", () => {
  it("extracts string and object image URLs", () => {
    expect(
      extractPropertyImageUrls([
        "https://cdn.example.test/a.jpg",
        { url: "https://cdn.example.test/b.jpg" },
        { url: "not-a-url" },
      ]),
    ).toEqual(["https://cdn.example.test/a.jpg", "https://cdn.example.test/b.jpg"]);
  });

  it("rejects a URL that is not on the tenant property", () => {
    const photos = validatePhotoRequests([{ type: "url", url: "https://cdn.example.test/a.jpg" }]);
    expect(photos.ok).toBe(true);
    if (!photos.ok) return;
    expect(assertTenantPhotoUrls(photos.photos, ["https://cdn.example.test/other.jpg"]).ok).toBe(false);
    expect(assertTenantPhotoUrls(photos.photos, ["https://cdn.example.test/a.jpg"]).ok).toBe(true);
  });

  it("blocks loopback and RFC1918 hosts", () => {
    expect(isBlockedPhotoHost("localhost")).toBe(true);
    expect(isBlockedPhotoHost("10.0.0.8")).toBe(true);
    expect(isBlockedPhotoHost("192.168.1.10")).toBe(true);
    expect(isBlockedPhotoHost("172.16.0.2")).toBe(true);
    expect(isBlockedPhotoHost("cdn.example.test")).toBe(false);
  });
});

describe("generateListingContentFromPhotos", () => {
  it("sends photo rules and returns mock listing JSON", async () => {
    const fixture = {
      portal_text: "portal",
      fb_ad_copy: "fb",
      ig_caption: "ig",
      email_subject: "subj",
      email_body: "body",
      seo_keywords: ["a", "b", "c", "d", "e", "f"],
    };
    const provider = createMockListingVisionProvider(fixture);
    const { content, audit } = await generateListingContentFromPhotos(
      {
        property,
        persona: "FAMILY",
        photos: [{ source: "base64", mediaType: "image/png", data: "abc" }],
      },
      provider,
    );
    expect(content.portal_text).toBe("portal");
    expect(audit.model).toBe("mock-listing-vision");
    expect(buildListingFromPhotosUserPrompt(property, "FAMILY")).toContain(PHOTO_FACT_RULES);
    expect(buildListingFromPhotosUserPrompt(property, "FAMILY")).toContain("NEHNUTEĽNOSŤ NA PREDAJ");
  });
});
