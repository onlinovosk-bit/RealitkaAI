import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("[verification] Google Ads search REST path", () => {
  it("client.search() uses googleAds:search, not customers/{id}:search", () => {
    const client = readFileSync(
      join(CRM_ROOT, "src/lib/acquisition/google-ads-client.ts"),
      "utf8",
    );
    expect(client).toContain('this.request("googleAds:search"');
    expect(client).not.toMatch(/this\.request\(":search"/);
  });

  it("search-terms GAQL limits segments.date to a finite range", () => {
    const src = readFileSync(
      join(CRM_ROOT, "src/lib/acquisition/sync/search-terms.ts"),
      "utf8",
    );
    expect(src).toMatch(/segments\.date DURING LAST_7_DAYS/);
  });
});