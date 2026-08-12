/**
 * L12 / A3 — golden regression for listing generator outputs.
 *
 * Runs WITHOUT an LLM call: validates output PROPERTIES against stored
 * K3/approved portal_text fixtures (sales PRED inputs + C4 K3 texts).
 *
 * ## What a generator test-mode would need (not implemented yet)
 * `generateListingContent` always calls Claude via `callClaude`. A true
 * LLM-free generator regression would require one of:
 * 1. Injected `llmCall` / `generateListingContent({ ..., client })` seam, or
 * 2. Env flag (e.g. LISTING_CONTENT_TEST_MODE=fixture) that returns fixture
 *    JSON by property hash / id without network, or
 * 3. Vitest mock of `./claude` `callClaude` returning canned JSON.
 * Until then this suite locks the property validators + golden outputs.
 */
import { describe, expect, it } from "vitest";
import type { PropertyInput } from "@/lib/ai/listing-content";
import { buildListingUserPrompt } from "@/lib/ai/listing-content";
import {
  LISTING_GOLDEN_BAN_WORDS,
  LISTING_GOLDEN_FIXTURES,
  LISTING_GOLDEN_WORD_MAX,
  LISTING_GOLDEN_WORD_MIN,
  type ListingGoldenFixture,
} from "./__fixtures__/listing-golden";

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Slovak-ish number atoms: grouped thousands + plain digits. */
function extractNumberAtoms(text: string): string[] {
  const atoms: string[] = [];
  for (const m of text.matchAll(/\d{1,3}(?:\s\d{3})+/g)) {
    atoms.push(m[0].replace(/\s+/g, ""));
  }
  for (const m of text.matchAll(/\d+/g)) atoms.push(m[0]);
  return [...new Set(atoms)];
}

function normalizeDigits(phone: string): string {
  return phone.replace(/\D+/g, "");
}

function phonePresent(text: string, phone: string): boolean {
  const want = normalizeDigits(phone);
  const hay = normalizeDigits(text);
  if (hay.includes(want)) return true;
  if (want.startsWith("0") && hay.includes(`421${want.slice(1)}`)) return true;
  if (want.startsWith("421") && hay.includes(`0${want.slice(3)}`)) return true;
  return false;
}

function brokerNamePresent(text: string, fixture: ListingGoldenFixture): boolean {
  const lower = text.toLocaleLowerCase("sk");
  return fixture.broker.nameNeedles.some((n) =>
    lower.includes(n.toLocaleLowerCase("sk")),
  );
}

/**
 * Ban word without a digit in the same sentence = fail.
 * (FINAL: Superlativ bez cisla = zakazany / lane L12)
 */
function findBanWordsWithoutNumber(text: string): string[] {
  const sentences = text.split(/[.!?\n]+/);
  const hits: string[] = [];
  for (const sentence of sentences) {
    if (/\d/.test(sentence)) continue;
    const lower = sentence.toLocaleLowerCase("sk");
    for (const ban of LISTING_GOLDEN_BAN_WORDS) {
      if (lower.includes(ban.toLocaleLowerCase("sk"))) hits.push(ban);
    }
  }
  return [...new Set(hits)];
}

function allowedNumberSet(fixture: ListingGoldenFixture): Set<string> {
  const chunks: string[] = [
    ...fixture.allowedFacts,
    JSON.stringify(fixture.input),
    fixture.broker.phone,
    fixture.broker.name,
  ];
  const set = new Set<string>();
  for (const chunk of chunks) {
    for (const atom of extractNumberAtoms(chunk)) set.add(atom);
  }
  for (const n of ["1", "2", "3", "15", "20"]) set.add(n);
  return set;
}

function numbersOutsideAllowlist(
  fixture: ListingGoldenFixture,
  text: string,
): string[] {
  const allowed = allowedNumberSet(fixture);
  return extractNumberAtoms(text).filter((n) => !allowed.has(n));
}

function assertOutputProperties(
  fixture: ListingGoldenFixture,
  portalText: string,
) {
  const words = countWords(portalText);
  expect(
    words,
    `${fixture.id}: portal_text word count ${words} not in ${LISTING_GOLDEN_WORD_MIN}-${LISTING_GOLDEN_WORD_MAX}`,
  ).toBeGreaterThanOrEqual(LISTING_GOLDEN_WORD_MIN);
  expect(words).toBeLessThanOrEqual(LISTING_GOLDEN_WORD_MAX);

  expect(
    findBanWordsWithoutNumber(portalText),
    `${fixture.id}: ban words without a number in sentence`,
  ).toEqual([]);

  expect(
    brokerNamePresent(portalText, fixture),
    `${fixture.id}: broker name missing (needles ${fixture.broker.nameNeedles.join(", ")})`,
  ).toBe(true);
  expect(
    phonePresent(portalText, fixture.broker.phone),
    `${fixture.id}: broker phone ${fixture.broker.phone} missing 1:1`,
  ).toBe(true);

  expect(
    numbersOutsideAllowlist(fixture, portalText),
    `${fixture.id}: numeric facts outside allowedFacts/input`,
  ).toEqual([]);
}

describe("listing golden regression (A3 / L12) — LLM-free property validators", () => {
  it("locks exactly 4 approved fixtures (Sabinov, Teriakovce, Ľubotice, Modrá n. C.)", () => {
    expect(LISTING_GOLDEN_FIXTURES.map((f) => f.id)).toEqual([
      "sabinov",
      "teriakovce",
      "lubotice",
      "modra-nad-cirochou",
    ]);
  });

  it("documents that generateListingContent has no test-mode seam yet", async () => {
    const src = await import("@/lib/ai/listing-content");
    expect(typeof src.generateListingContent).toBe("function");
    expect(typeof src.buildListingUserPrompt).toBe("function");
  });

  for (const fixture of LISTING_GOLDEN_FIXTURES) {
    describe(fixture.label, () => {
      it("PRED/input maps to PropertyInput and prompt includes broker facts", () => {
        const input: PropertyInput = fixture.input;
        expect(input.type).toBeTruthy();
        expect(input.location).toBeTruthy();
        expect(typeof input.size_m2).toBe("number");
        expect(typeof input.price).toBe("number");
        expect(input.features.length).toBeGreaterThan(0);

        const prompt = buildListingUserPrompt(input, "GENERAL");
        expect(prompt).toContain(input.location);
        expect(prompt).toContain(String(input.size_m2));
        expect(prompt.toLocaleLowerCase("sk")).toContain(
          fixture.broker.nameNeedles[0].toLocaleLowerCase("sk"),
        );
        expect(normalizeDigits(prompt)).toContain(
          normalizeDigits(fixture.broker.phone).replace(/^421/, ""),
        );
      });

      it("approved K3 portal_text satisfies golden output properties (no LLM)", () => {
        assertOutputProperties(fixture, fixture.approvedPortalText);
      });

      it("negative: PRED-style fluff fails ban-word rule", () => {
        const fluff =
          "Na predaj ponúkame krásny a útulný byt. Jedinečná príležitosť, exkluzívne bývanie. " +
          `Zavolajte ${fixture.broker.name} na ${fixture.broker.phone}.`;
        expect(findBanWordsWithoutNumber(fluff).length).toBeGreaterThan(0);
      });
    });
  }
});
