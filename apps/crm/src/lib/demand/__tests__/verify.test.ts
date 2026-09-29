import { describe, expect, it } from "vitest";
import {
  areasInEvidence,
  evidenceInText,
  numbersInEvidence,
  roomsInEvidence,
  verifyField,
  verifyProposal,
} from "../verify";
import { DEMAND_FIELDS, isCoreComplete, knownFields } from "../contract";

const TEXT =
  "Dobrý deň, hľadáme 3-izbový byt v Košiciach, sídlisko Terasa, rozpočet máme do 250 000 €. " +
  "Kúpa na hypotéku, ideálne okolo 70 m2. Sťahovať sa chceme čo najskôr.";

const p = (value: unknown, evidence: string, confidence = 1) => ({ value, evidence, confidence });

describe("number readers", () => {
  it("reads the ways people write prices", () => {
    expect(numbersInEvidence("do 250 000 €")).toContain(250000);
    expect(numbersInEvidence("do 250.000 eur")).toContain(250000);
    expect(numbersInEvidence("max 250k")).toContain(250000);
    expect(numbersInEvidence("okolo 250 tis.")).toContain(250000);
    expect(numbersInEvidence("1,2 mil. eur")).toContain(1200000);
  });
  it("reads rooms and areas", () => {
    expect(roomsInEvidence("3-izbový byt")).toContain(3);
    expect(roomsInEvidence("2 izby")).toContain(2);
    expect(roomsInEvidence("byt 2+kk")).toContain(2);
    expect(roomsInEvidence("garsónka")).toContain(1);
    expect(areasInEvidence("okolo 70 m2")).toContain(70);
    expect(areasInEvidence("70m²")).toContain(70);
  });
  it("matches evidence ignoring case, diacritics and spacing", () => {
    expect(evidenceInText("ROZPOČET máme  do 250 000 €", TEXT)).toBe(true);
    expect(evidenceInText("rozpocet mame do 300 000 €", TEXT)).toBe(false);
    expect(evidenceInText("", TEXT)).toBe(false);
  });
});

describe("verifyField — AP-001 in code", () => {
  it("accepts a value its quote proves", () => {
    const f = verifyField("budget_max", p(250000, "rozpočet máme do 250 000 €"), TEXT);
    expect(f).toMatchObject({ value: 250000, source: "inquiry_text", confidence: 1 });
  });

  it("rejects a quote that is not in the text (hallucinated evidence)", () => {
    const f = verifyField("budget_max", p(300000, "rozpočet do 300 000 €"), TEXT);
    expect(f).toMatchObject({ value: null, evidence: null, confidence: 0, rejected: "evidence_not_in_text" });
  });

  it("rejects a value the real quote does not contain (hallucinated value)", () => {
    const f = verifyField("budget_max", p(300000, "rozpočet máme do 250 000 €"), TEXT);
    expect(f.rejected).toBe("value_not_in_evidence");
    expect(f.value).toBeNull();
  });

  it("rejects a location not named in its quote", () => {
    const f = verifyField("location", p("Bratislava", "hľadáme 3-izbový byt v Košiciach"), TEXT);
    expect(f.rejected).toBe("value_not_in_evidence");
  });

  it("accepts a location named in its quote", () => {
    const f = verifyField("location", p("Košice, Terasa", "v Košiciach, sídlisko Terasa"), TEXT);
    // "Košice" is not a substring of "Košiciach": inflected forms are rejected,
    // the model must write the place as it appears.
    expect(f.rejected).toBe("value_not_in_evidence");
    const g = verifyField("location", p("Terasa", "sídlisko Terasa"), TEXT);
    expect(g.value).toBe("Terasa");
  });

  it("rejects enums outside the contract and enums the quote does not support", () => {
    expect(verifyField("property_type", p("vila", "3-izbový byt"), TEXT).rejected).toBe("invalid_value");
    expect(verifyField("property_type", p("dom", "3-izbový byt"), TEXT).rejected).toBe("value_not_in_evidence");
    expect(verifyField("property_type", p("byt", "3-izbový byt"), TEXT).value).toBe("byt");
    expect(verifyField("financing", p("hypoteka", "Kúpa na hypotéku"), TEXT).value).toBe("hypoteka");
    expect(verifyField("disposition", p("kupa", "Kúpa na hypotéku"), TEXT).value).toBe("kupa");
    expect(verifyField("urgency", p("ihned", "čo najskôr"), TEXT).value).toBe("ihned");
  });

  it("rejects low confidence and out-of-bounds numbers", () => {
    expect(verifyField("budget_max", p(250000, "do 250 000 €", 0.3), TEXT).rejected).toBe("low_confidence");
    expect(verifyField("rooms_min", p(3, "3-izbový byt"), TEXT).value).toBe(3);
    expect(verifyField("budget_max", p(5, "do 250 000 €"), TEXT).rejected).toBe("invalid_value");
  });

  it("keeps an explicit unknown for null proposals", () => {
    expect(verifyField("area_max", null, TEXT)).toEqual({
      value: null,
      confidence: 0,
      source: null,
      evidence: null,
    });
  });
});

describe("verifyProposal", () => {
  it("returns every contract field, unknown unless proven", () => {
    const d = verifyProposal(
      {
        property_type: p("byt", "3-izbový byt"),
        location: p("Terasa", "sídlisko Terasa"),
        budget_max: p(250000, "do 250 000 €"),
        budget_min: p(200000, "od 200 000 €"), // not in the text
        rooms_min: p(3, "3-izbový"),
        made_up_key: p("x", "x"),
      },
      TEXT,
    );
    expect(Object.keys(d).sort()).toEqual([...DEMAND_FIELDS].sort());
    expect(knownFields(d).sort()).toEqual(["budget_max", "location", "property_type", "rooms_min"]);
    expect(d.budget_min.rejected).toBe("evidence_not_in_text");
    expect(isCoreComplete(d)).toBe(true);
  });

  it("drops an inverted range instead of swapping it", () => {
    const text = "rozpočet od 300 000 do 200 000 €";
    const d = verifyProposal(
      { budget_min: p(300000, "od 300 000"), budget_max: p(200000, "do 200 000 €") },
      text,
    );
    expect(d.budget_min.value).toBeNull();
    expect(d.budget_max.value).toBeNull();
  });

  it("yields all-unknown for garbage input", () => {
    for (const raw of [null, "text", 42, []]) {
      const d = verifyProposal(raw, TEXT);
      expect(knownFields(d)).toEqual([]);
    }
  });
});
