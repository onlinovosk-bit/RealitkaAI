import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

describe("[verification] Listing from photos V0", () => {
  it("is gated by LISTING_FROM_PHOTOS_V0 === 1 and 404 when off", () => {
    const flag = read("src/lib/ai/listing-from-photos-flag.ts");
    const route = read("src/app/api/ai/listing-from-photos/route.ts");
    expect(flag).toContain('LISTING_FROM_PHOTOS_V0 === "1"');
    expect(route).toContain("isListingFromPhotosEnabled");
    expect(route).toContain("404");
    expect(route).not.toContain('LISTING_FROM_PHOTOS_V0 === "true"');
  });

  it("requires session, agency tenant, and listingDescription credits", () => {
    const route = read("src/app/api/ai/listing-from-photos/route.ts");
    expect(route).toContain('auth.getUser()');
    expect(route).toContain("Missing agency_id");
    expect(route).toContain('action: "listingDescription"');
    expect(route).toContain("spendForAction");
    expect(route).toContain("eq(\"agency_id\", agencyId)");
    expect(route).toContain("assertTenantPhotoUrls");
    expect(route).toContain("incrementUsageMetric");
  });

  it("does not embed secrets and documents ANTHROPIC_API_KEY", () => {
    const route = read("src/app/api/ai/listing-from-photos/route.ts");
    const provider = read("src/lib/ai/anthropic-listing-vision.ts");
    expect(route).not.toMatch(/sk-ant-/);
    expect(provider).toContain("ANTHROPIC_API_KEY");
    expect(provider).toContain("missing_key");
  });

  it("UI shows photo upload only when the page passes the flag", () => {
    const page = read("src/app/(dashboard)/inzerat-generator/page.tsx");
    const client = read("src/components/listing-generator/ListingGeneratorClient.tsx");
    expect(page).toContain("isListingFromPhotosEnabled");
    expect(page).toContain("photosEnabled");
    expect(client).toContain("photosEnabled");
    expect(client).toContain("/api/ai/listing-from-photos");
  });
});
