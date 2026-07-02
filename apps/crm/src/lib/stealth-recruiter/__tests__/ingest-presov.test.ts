import { describe, expect, it } from "vitest";
import {
  buildProspectsFromListings,
  computeStealthScore,
  daysListedFromPubDate,
  formatProspectAddress,
  listingMatchesPresovArea,
  mapListingToStealthProspect,
} from "@/lib/stealth-recruiter/ingest-presov";
import type { PortalListing } from "@/types/arbitrage";

describe("ingest-presov heuristics", () => {
  it("computes days listed from pubDate", () => {
    const ref = new Date("2026-05-31T12:00:00Z");
    const pub = "Sat, 01 Mar 2026 10:00:00 GMT";
    const days = daysListedFromPubDate(pub, ref);
    expect(days).toBeGreaterThan(80);
    expect(days).toBeLessThan(100);
  });

  it("formats address with location", () => {
    expect(formatProspectAddress("3-izbový byt", "Prešov")).toBe(
      "3-izbový byt, Prešov",
    );
    expect(formatProspectAddress("Byt Prešov centrum", "Prešov")).toBe(
      "Byt Prešov centrum",
    );
  });

  it("scores stale and discounted listings higher", () => {
    const stale = computeStealthScore({
      daysListed: 130,
      currentPrice: 120000,
      title: "Byt Prešov",
      description: "znížená cena",
    });
    const fresh = computeStealthScore({
      daysListed: 5,
      currentPrice: 120000,
      title: "Byt Prešov",
    });
    expect(stale).toBeGreaterThan(fresh);
    expect(stale).toBeGreaterThanOrEqual(80);
  });

  it("matches Prešov area hints", () => {
    expect(
      listingMatchesPresovArea(
        { city: "presov", title: "Byt" },
        "Prešov",
      ),
    ).toBe(true);
    expect(
      listingMatchesPresovArea(
        { city: "bratislava", title: "Byt" },
        "Prešov",
      ),
    ).toBe(false);
  });

  it("maps listing to verified prospect row", () => {
    const ref = new Date("2026-05-31T12:00:00Z");
    const row = mapListingToStealthProspect(
      {
        title: "Rodinný dom Sabinov",
        price: 145000,
        city: "sabinov",
        location_raw: "Sabinov",
        seller_type: "private",
        first_seen_at: "2026-02-01T10:00:00.000Z",
        description: "vlastník, bez RK",
      },
      "11111111-1111-1111-1111-111111111111",
      "Prešov",
      ref,
    );

    expect(row).not.toBeNull();
    expect(row?.platform).toBe("bazos");
    expect(row?.status).toBe("verified");
    expect(row?.region).toBe("Prešov");
    expect(row?.score).toBeGreaterThanOrEqual(60);
    expect(row?.days_listed).toBeGreaterThan(100);
  });

  it("skips agency sellers and rows without price", () => {
    expect(
      mapListingToStealthProspect(
        { title: "RK inzerát", price: 100000, seller_type: "agency" },
        "agency-1",
        "Prešov",
      ),
    ).toBeNull();
    expect(
      mapListingToStealthProspect(
        { title: "Bez ceny", seller_type: "private" },
        "agency-1",
        "Prešov",
      ),
    ).toBeNull();
  });

  it("deduplicates by address in buildProspectsFromListings", () => {
    const listing: Partial<PortalListing> = {
      title: "Byt Levoča",
      price: 99000,
      city: "levoča",
      seller_type: "private",
      first_seen_at: "2026-01-15T10:00:00.000Z",
    };
    const rows = buildProspectsFromListings(
      [listing, { ...listing }],
      "11111111-1111-1111-1111-111111111111",
      "Prešov",
    );
    expect(rows).toHaveLength(1);
  });
});
