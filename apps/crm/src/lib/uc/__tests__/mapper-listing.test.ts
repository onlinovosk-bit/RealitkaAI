import { describe, expect, it } from "vitest";
import { UC_DOC_LISTING_SAMPLE } from "@/lib/uc/fixtures";
import { mapUcListingPayload } from "@/lib/uc/mapper-listing";

describe("mapUcListingPayload", () => {
  it("maps documented listing fixture into properties shape", () => {
    const mapped = mapUcListingPayload({ ...UC_DOC_LISTING_SAMPLE });

    expect(mapped.externalId).toBe("784691");
    expect(mapped.agencyListingId).toBe("rk-784691");
    expect(mapped.title).toBe("Nadpis");
    expect(mapped.description).toBe("Popis");
    expect(mapped.location).toBe("Hlavná 12");
    expect(mapped.price).toBe(569);
    expect(mapped.currency).toBe("EUR");
    expect(mapped.type).toBe("Byt");
    expect(mapped.rooms).toBe("Garsónka");
    expect(mapped.transactionType).toBe("Predaj");
    expect(mapped.usableArea).toBe(24);
    expect(mapped.brokerSourceId).toBe("testImport");
    expect(mapped.images).toHaveLength(2);
    expect(mapped.langData.en?.title).toBe("Title");
    expect(mapped.medias.youtube).toHaveLength(1);
    expect(mapped.flags.adv_sunny).toBeUndefined();
    expect(mapped.taxonomy.category).toBe(4);
    expect(mapped.taxonomy.subcategory).toBe(401);
  });

  it("dedupe key uses object_id over id", () => {
    const mapped = mapUcListingPayload({
      ...UC_DOC_LISTING_SAMPLE,
      object_id: 999,
      id: "other",
    });

    expect(mapped.externalId).toBe("999");
  });

  it("requires object_id or id", () => {
    expect(() =>
      mapUcListingPayload({
        title: "Bez ID",
        description: "x",
        deleted: 0,
      }),
    ).toThrow(/object_id/);
  });
});
