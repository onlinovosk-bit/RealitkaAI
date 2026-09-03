import { describe, expect, it } from "vitest";
import { REALVIA_SMOLKO_13303557 } from "@/lib/capabilities/_shared/fixtures/realvia-smolko-13303557";
import { REALVIA_MAPPING_UNKNOWN } from "@/lib/realvia/map-taxonomy";
import {
  buildLaunchPackExport,
  factsFromPropertyInput,
  factsFromRealviaRow,
  resolveTaxonomy,
} from "@/lib/capabilities/property-launch-pack/facts";
import { buildPropertyLaunchPack } from "@/lib/capabilities/property-launch-pack/build";
import type { ListingContent } from "@/lib/ai/listing-content";

const AGENCY = "11111111-1111-1111-1111-111111111111";

const mockChannels: ListingContent = {
  portal_text: "Byt Prešov, 62 m², cena 150000 EUR.",
  fb_ad_copy: "Byt Prešov 150000 EUR",
  ig_caption: "Prešov 62 m²",
  email_subject: "Byt Prešov",
  email_body: "Byt Prešov, 62 m², cena 150000 EUR.",
  seo_keywords: ["byt", "prešov", "predaj", "a", "b", "c"],
  titles: ["Byt Prešov", "Sociál", "Alt"],
};

describe("property-launch-pack facts", () => {
  it("maps manual PropertyInput to canonical facts", () => {
    const facts = factsFromPropertyInput({
      type: "Byt",
      location: "Prešov",
      size_m2: 62,
      price: 150_000,
      condition: "po rekonštrukcii",
      features: ["balkón"],
    });
    expect(facts.source).toBe("manual");
    expect(facts.type).toBe("Byt");
    expect(facts.transactionType).toBe(REALVIA_MAPPING_UNKNOWN);
  });

  it("applies honest mapper to payload codes without using titles or DB fog", () => {
    const row = {
      ...REALVIA_SMOLKO_13303557,
      type: "Ostatné",
      transaction_type: "Predaj",
      payload_raw: { advert: { category: 30, transaction: 123 } },
    };
    const facts = factsFromRealviaRow(row);
    expect(facts.type).toBe(REALVIA_MAPPING_UNKNOWN);
    expect(facts.transactionType).toBe(REALVIA_MAPPING_UNKNOWN);
  });

  it("maps Realvia row and preserves Neznáme taxonomy", () => {
    const row = {
      ...REALVIA_SMOLKO_13303557,
      type: REALVIA_MAPPING_UNKNOWN,
      transaction_type: REALVIA_MAPPING_UNKNOWN,
    };
    const facts = factsFromRealviaRow(row);
    expect(facts.source).toBe("realvia");
    expect(facts.sourceId).toBe("13303557");
    expect(facts.type).toBe(REALVIA_MAPPING_UNKNOWN);
  });

  it("resolveTaxonomy requires maklér confirm for Neznáme", () => {
    const facts = factsFromRealviaRow({
      ...REALVIA_SMOLKO_13303557,
      type: REALVIA_MAPPING_UNKNOWN,
      transaction_type: REALVIA_MAPPING_UNKNOWN,
    });
    const blocked = resolveTaxonomy(facts);
    expect(blocked.type).toBe(REALVIA_MAPPING_UNKNOWN);
    expect(blocked.needsTypeConfirm).toBe(true);

    const ok = resolveTaxonomy(facts, { type: "Dom", transactionType: "Predaj" });
    expect(ok.type).toBe("Dom");
    expect(ok.transactionType).toBe("Predaj");
    expect(ok.needsTypeConfirm).toBe(false);
    expect(ok.needsTxnConfirm).toBe(false);
  });

  it("export strips payload_raw / broker PII keys", () => {
    const dirty = buildLaunchPackExport({
      version: 1,
      generatedAt: "2026-09-03T00:00:00.000Z",
      source: "realvia",
      sourceId: "13303557",
      propertyId: "13303557",
      taxonomy: { type: "Dom", transactionType: "Predaj" },
      persona: "GENERAL",
      channels: mockChannels,
      guardian: { verdict: "pass", reasons: [], blockedPublish: false },
      payload_raw: { secret: true },
      broker_phone: "+421",
    } as never);
    expect(JSON.stringify(dirty)).not.toContain("payload_raw");
    expect(JSON.stringify(dirty)).not.toContain("broker_phone");
  });
});

describe("buildPropertyLaunchPack", () => {
  it("blocks export when taxonomy still Neznáme", async () => {
    const facts = factsFromRealviaRow({
      ...REALVIA_SMOLKO_13303557,
      type: REALVIA_MAPPING_UNKNOWN,
      transaction_type: "Predaj",
      price: 150_000,
      usable_area: 76,
    });

    const result = await buildPropertyLaunchPack({
      agencyId: AGENCY,
      facts,
      generate: async () => ({
        content: mockChannels,
        audit: { model: "test", costEur: 0, latencyMs: 1 },
      }),
    });

    expect(result.exportAllowed).toBe(false);
    expect(result.guardian.reasons).toContain("unverified_property_type");
    expect(result.exportPayload).toBeNull();
  });

  it("does not call the generator when taxonomy is still Neznáme", async () => {
    let called = false;
    const facts = factsFromRealviaRow({
      ...REALVIA_SMOLKO_13303557,
      type: REALVIA_MAPPING_UNKNOWN,
      transaction_type: REALVIA_MAPPING_UNKNOWN,
    });
    await buildPropertyLaunchPack({
      agencyId: AGENCY,
      facts,
      generate: async () => {
        called = true;
        return {
          content: mockChannels,
          audit: { model: "test", costEur: 0, latencyMs: 1 },
        };
      },
    });
    expect(called).toBe(false);
  });

  it("allows export after maklér confirms taxonomy", async () => {
    const facts = factsFromRealviaRow({
      ...REALVIA_SMOLKO_13303557,
      type: REALVIA_MAPPING_UNKNOWN,
      transaction_type: REALVIA_MAPPING_UNKNOWN,
      price: 150_000,
      usable_area: 76,
      title: "Rodinný dom Modrá",
      description: "Rodinný dom Modrá nad Cirochou, 76 m², cena 150000 EUR.",
    });

    const result = await buildPropertyLaunchPack({
      agencyId: AGENCY,
      facts,
      taxonomyConfirm: { type: "Dom", transactionType: "Predaj" },
      propertyRow: {
        ...REALVIA_SMOLKO_13303557,
        price: 150_000,
      },
      generate: async () => ({
        content: {
          ...mockChannels,
          portal_text: "Rodinný dom Modrá nad Cirochou, 76 m², cena 150000 EUR.",
          email_body: "Rodinný dom Modrá nad Cirochou, 76 m², cena 150000 EUR.",
          fb_ad_copy: "Dom Modrá 150000 EUR",
        },
        audit: { model: "test", costEur: 0, latencyMs: 1 },
      }),
    });

    expect(result.exportAllowed).toBe(true);
    expect(result.exportPayload?.channels.portal_text).toContain("Modrá");
    expect(result.exportPayload?.packMeta?.publishBlocked).toBe(true);
    expect(result.exportPayload?.taxonomy.type).toBe("Dom");
  });
});
