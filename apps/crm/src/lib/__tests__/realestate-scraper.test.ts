import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { scrapeRealEstate } from "@/lib/scraper/realestate-scraper";

describe("scrapeRealEstate", () => {
  const prev = process.env.SCRAPER_LIVE_ENABLED;

  beforeEach(() => {
    process.env.SCRAPER_LIVE_ENABLED = "false";
  });

  afterEach(() => {
    process.env.SCRAPER_LIVE_ENABLED = prev;
  });

  it("v mock režime vráti deterministické záznamy", async () => {
    const r = await scrapeRealEstate();
    expect(r.mode).toBe("mock");
    expect(r.agencies.length).toBeGreaterThan(0);
    expect(r.agencies[0].name).toContain("mock");
  });
});
