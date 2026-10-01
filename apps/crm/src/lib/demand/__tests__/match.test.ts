import { describe, expect, it } from "vitest";
import { emptyDemand, type Demand, type DemandFieldName } from "../contract";
import { locationMatches, matchDemand, propertyTypeOf, MAX_MATCHES, type PropertyForMatch } from "../match";

function demand(fields: Partial<Record<DemandFieldName, [unknown, string]>>, rejected: DemandFieldName[] = []): Demand {
  const d = emptyDemand();
  for (const [k, [value, evidence]] of Object.entries(fields) as [DemandFieldName, [unknown, string]][]) {
    (d as Record<string, unknown>)[k] = { value, confidence: 1, source: "inquiry_text", evidence };
  }
  for (const k of rejected) {
    (d as Record<string, unknown>)[k] = { value: null, confidence: 0, source: null, evidence: null, rejected: "evidence_not_in_text" };
  }
  return d;
}

let seq = 0;
function prop(p: Partial<PropertyForMatch> = {}): PropertyForMatch {
  seq += 1;
  return {
    id: `p${seq}`,
    type: "Byt",
    location: "Bratislava - Petržalka",
    price: 180000,
    rooms_count: 2,
    usable_area: 55,
    transaction_type: "Predaj",
    status: "Aktívna",
    ...p,
  };
}

const BUYER = demand({
  property_type: ["byt", "2-izbový byt"],
  location: ["Petržalke", "v Petržalke"],
  budget_max: [200000, "do 200 000 €"],
  disposition: ["kupa", "chceme kúpiť"],
});

describe("contract §5 acceptance", () => {
  it("no verified demand → 0 matches, never a guess from leads columns", () => {
    // The engine has no Lead parameter at all: leads.property_type ("Byt" from a
    // form default) cannot reach it. An empty demand record yields nothing.
    const r = matchDemand(emptyDemand(), [prop()]);
    expect(r).toMatchObject({ ok: false, reason: "insufficient_demand", matches: [] });
  });

  it("a rejected field is ignored, not used", () => {
    const d = demand({ property_type: ["byt", "byt"], budget_max: [200000, "do 200 000 €"] }, ["location"]);
    const r = matchDemand(d, [prop({ location: "Košice" })]);
    expect(r.ok && r.matches[0].fields.location?.status).toBe("unknown");
  });

  it("missing budget stays unknown — no 180 000 € fallback", () => {
    const d = demand({ property_type: ["byt", "byt"], location: ["Petržalke", "v Petržalke"] });
    const r = matchDemand(d, [prop({ price: 900000 })]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.matches[0].fields.budget_max).toMatchObject({ status: "unknown", property_value: 900000 });
    expect(r.matches[0].fields.budget_max).not.toHaveProperty("lead_value");
  });

  it("every match carries the lead's evidence next to the listing value", () => {
    const r = matchDemand(BUYER, [prop()]);
    expect(r.ok && r.matches[0].fields.location).toEqual({
      status: "match", lead_value: "Petržalke", lead_evidence: "v Petržalke", property_value: "Bratislava - Petržalka",
    });
  });
});

describe("hard filters", () => {
  it("type must match; an unknown listing type is not a match", () => {
    const r = matchDemand(BUYER, [prop({ type: "Dom" }), prop({ type: "Neznáme" }), prop({ type: "Záhradný domček" })]);
    expect(r.ok && r.matches).toEqual([]);
  });

  it("buyer vs renter vs a 'Dopyt' row", () => {
    const r = matchDemand(BUYER, [prop({ transaction_type: "Prenájom" }), prop({ transaction_type: "Dopyt" })]);
    expect(r.ok && r.matches).toEqual([]);
  });

  it("a 'Dopyt' row is demand, not supply — even when the lead did not say buy or rent", () => {
    const d = demand({ property_type: ["byt", "byt"], location: ["Petržalke", "v Petržalke"] });
    const r = matchDemand(d, [prop({ transaction_type: "Dopyt" }), prop({ transaction_type: "Predaj" })]);
    expect(r.ok && r.matches.map((m) => m.fields.transaction?.property_value)).toEqual(["Predaj"]);
  });

  it("a stored field carrying a value AND a rejection is never trusted", () => {
    const d = demand({ property_type: ["byt", "byt"], budget_max: [200000, "do 200 000 €"] });
    (d as Record<string, unknown>).location = {
      value: "Ružinov", confidence: 1, source: "inquiry_text", evidence: "Ružinov", rejected: "value_not_in_evidence",
    };
    const r = matchDemand(d, [prop({ location: "Bratislava - Petržalka" })]);
    expect(r.ok && r.matches[0]?.fields.location?.status).toBe("unknown");
  });

  it("only active listings, including the 'Aktivna' spelling found on PROD", () => {
    const r = matchDemand(BUYER, [prop({ status: "Predaná" }), prop({ status: "Stiahnutá" }), prop({ status: "Aktivna" })]);
    expect(r.ok && r.matches.length).toBe(1);
  });

  it("a seller or landlord is not matched against supply", () => {
    const d = demand({ property_type: ["byt", "byt"], location: ["Petržalke", "v Petržalke"], disposition: ["predaj", "chcem predať"] });
    expect(matchDemand(d, [prop()])).toMatchObject({ ok: false, reason: "not_a_buyer" });
  });

  it("another place is dropped, not scored lower", () => {
    const r = matchDemand(BUYER, [prop({ location: "Bratislava - Ružinov" })]);
    expect(r.ok && r.matches).toEqual([]);
  });

  it("type alone is too weak: no location and an unpriced listing → no match", () => {
    const d = demand({ property_type: ["byt", "byt"], budget_max: [200000, "do 200 000 €"] });
    const r = matchDemand(d, [prop({ price: null })]);
    expect(r.ok && r.matches).toEqual([]);
  });
});

describe("budget and ranges", () => {
  it("within budget ✓, up to 10 % over ✗ but shown, beyond dropped", () => {
    const r = matchDemand(BUYER, [prop({ price: 190000 }), prop({ price: 215000 }), prop({ price: 260000 })]);
    if (!r.ok) throw new Error("expected ok");
    expect(r.matches.map((m) => m.fields.budget_max?.status)).toEqual(["match", "mismatch"]);
    expect(r.matches[0].score).toBeGreaterThan(r.matches[1].score);
  });

  it("rooms and area outside the stated range lower the score below the bar", () => {
    const d = demand({
      property_type: ["byt", "byt"],
      location: ["Petržalke", "v Petržalke"],
      budget_max: [200000, "do 200 000 €"],
      rooms_min: [3, "3-izbový"],
      area_min: [70, "aspoň 70 m2"],
    });
    const ok = prop({ price: 215000, rooms_count: 3, usable_area: 75 }); // budget ✗, rest ✓
    const bad = prop({ price: 215000, rooms_count: 1, usable_area: 30 }); // budget ✗ rooms ✗ area ✗
    const r = matchDemand(d, [ok, bad]);
    if (!r.ok) throw new Error("expected ok");
    expect(r.matches.map((m) => m.property_id)).toEqual([ok.id]);
  });

  it("unknown listing rooms/area neither add nor subtract", () => {
    const d = demand({
      property_type: ["byt", "byt"], location: ["Petržalke", "v Petržalke"], rooms_min: [2, "2 izby"],
    });
    const r = matchDemand(d, [prop({ rooms_count: null })]);
    if (!r.ok) throw new Error("expected ok");
    expect(r.matches[0].fields.rooms_min?.status).toBe("unknown");
    expect(r.matches[0].score).toBe(1);
  });
});

describe("helpers", () => {
  it("maps stored listing types, unknown stays null", () => {
    expect(propertyTypeOf("Byt")).toBe("byt");
    expect(propertyTypeOf("Komerčná")).toBe("komercny");
    expect(propertyTypeOf("Neznáme")).toBeNull();
    expect(propertyTypeOf(null)).toBeNull();
  });

  it("location copes with Slovak inflection, not with near-misses", () => {
    expect(locationMatches("Petržalke", "Bratislava - Petržalka")).toBe(true);
    expect(locationMatches("Košiciach", "Košice - Staré Mesto")).toBe(true);
    expect(locationMatches("Bratislava Ružinov", "Bratislava - Ružinov")).toBe(true);
    expect(locationMatches("Ružinov", "Bratislava - Petržalka")).toBe(false);
    expect(locationMatches("Nitra", "Nitrianske Pravno")).toBe(false);
  });

  it("returns at most MAX_MATCHES, best first", () => {
    const many = Array.from({ length: MAX_MATCHES + 5 }, (_, i) => prop({ price: i % 2 ? 190000 : 215000 }));
    const r = matchDemand(BUYER, many);
    if (!r.ok) throw new Error("expected ok");
    expect(r.matches).toHaveLength(MAX_MATCHES);
    expect(r.matches[0].score).toBeGreaterThanOrEqual(r.matches[MAX_MATCHES - 1].score);
  });
});

describe("production switch", () => {
  it("D4 writes only when DEMAND_MATCHING_ENABLED is exactly 'true'", async () => {
    const { demandMatchingEnabled } = await import("../match-store");
    expect(demandMatchingEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(demandMatchingEnabled({ DEMAND_MATCHING_ENABLED: "1" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(demandMatchingEnabled({ DEMAND_MATCHING_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});
