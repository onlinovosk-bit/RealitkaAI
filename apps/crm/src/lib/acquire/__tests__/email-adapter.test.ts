import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DATASET_VERSION,
  PARSER_VERSION,
  dedupKey,
  htmlToText,
  parseEmail,
  toLeadCandidate,
} from "../email-adapter";

const SMOLKO_AGENCY = "11111111-1111-1111-1111-111111111111";
/** Route uses date-only receivedAt (YYYY-MM-DD). */
const RECEIVED_AT = "2026-06-29";

/** Eval sample 1 — Nehnutelnosti.sk portal, viewing intent */
const EVAL_NEHNUTELNOSTI = `nehnutelnosti.sk notification
Meno: Jan Novak
E-mail: jan@example.com
Telefon: +421 912 345 678
Sprava: Chcem obhliadku co najskor
PO12345X`;

/** Eval sample 2 — Smolko web formulár forward */
const EVAL_SMOLKO_WEB = `formular@realitysmolko.sk
Meno a priezvisko: Maria Kova
E-mail: maria@test.sk
Telefon: 0911222333
Sprava: Informacie o cene prosim
Odoslane z: 3-izbovy byt Poprad`;

/** Eval sample 7 — Bazos Palenčár (Smolko gold, 18.03.2025) — docs/eval/eval-dataset-smolko-outcomes.md */
const EVAL_BAZOS_PALENCAR = readFileSync(
  join(process.cwd(), "../../docs/eval/fixtures/bazos-palencar-20250318.raw.txt"),
  "utf8",
);

/** Eval sample 3 — Bazos.sk (reálny forward tvar) */
const EVAL_BAZOS = `Re: Bazos.sk - odpoved na inzerat 181012929
Meno: Rastislav Smolko
E-mail: rastislav.smolko@gmail.com
Sprava: len sa informoval`;

/** Eval sample 4 — TopReality price question */
const EVAL_TOPREALITY = `topreality.sk lead
E-mail: buyer@test.sk
Sprava: aka je cena a depozit?`;

/** Eval sample 5 — unsubscribe */
const EVAL_UNSUBSCRIBE = `unsubscribe from list
E-mail: x@y.sk`;

/** Eval sample 6 — Byty.sk availability */
const EVAL_BYTY = `byty.sk
E-mail: klient@mail.sk
Telefon: 0905123456
Sprava: od kedy je voľný byt?`;

describe("email-adapter eval dataset", () => {
  it("eval 1: Nehnutelnosti portal inquiry", () => {
    const ev = parseEmail(EVAL_NEHNUTELNOSTI, RECEIVED_AT);
    expect(PARSER_VERSION).toBe("1.3");
    expect(DATASET_VERSION).toBe("v1.1");
    expect(ev.sourceType).toBe("Portal");
    expect(ev.source).toBe("Nehnuteľnosti.sk");
    expect(ev.inquiryIntent).toBe("Viewing Request");
    expect(ev.eventKind).toBe("inquiry");
    expect(ev.eventId).toHaveLength(16);
    expect(ev.rawHash).toHaveLength(40);
    const lead = toLeadCandidate(ev, SMOLKO_AGENCY, false);
    expect(lead?.source).toBe("portal:Nehnuteľnosti.sk");
    expect(lead?.agencyId).toBe(SMOLKO_AGENCY);
  });

  it("eval 2: Smolko website web_form", () => {
    const ev = parseEmail(EVAL_SMOLKO_WEB, RECEIVED_AT);
    expect(ev.sourceType).toBe("Website");
    expect(ev.listingTitle).toBe("3-izbovy byt Poprad");
    expect(ev.inquiryIntent).toBe("Information Request");
    expect(dedupKey(ev)).toBe("672608c5e7a2ebcd");
    const lead = toLeadCandidate(ev, SMOLKO_AGENCY, false);
    expect(lead?.source).toBe("web_form");
    expect(lead?._meta.parserVersion).toBe("1.3");
  });

  it("eval 7: Bazos Palenčár availability inquiry (Smolko gold)", () => {
    const ev = parseEmail(EVAL_BAZOS_PALENCAR, "2025-03-18");
    expect(ev.sourceType).toBe("Portal");
    expect(ev.source).toBe("Bazoš.sk");
    expect(ev.contactName).toBe("Miroslav Palenčár");
    expect(ev.contactEmail).toBe("palencarmiroslav3@gmail.com");
    expect(ev.contactPhone).toBeNull();
    expect(ev.listingPortalId).toBe("174767869");
    expect(ev.listingInternalId).toBe("RS051N");
    expect(ev.inquiryText).toContain("je váš inzerát ešte aktuálny");
    expect(ev.inquiryIntent).toBe("Availability Question");

    const lead = toLeadCandidate(ev, SMOLKO_AGENCY, false);
    expect(lead).not.toBeNull();
    expect(lead?.source).toBe("portal:Bazoš.sk");
    expect(lead?.email).toBe("palencarmiroslav3@gmail.com");
    expect(lead?.note).toContain("174767869");
  });

  it("eval 3: Bazos portal general inquiry", () => {
    const ev = parseEmail(EVAL_BAZOS, RECEIVED_AT);
    expect(ev.sourceType).toBe("Portal");
    expect(ev.source).toBe("Bazoš.sk");
    expect(ev.contactEmail).toBe("rastislav.smolko@gmail.com");
    expect(ev.inquiryIntent).toBe("General Inquiry");
    expect(toLeadCandidate(ev, SMOLKO_AGENCY, false)).not.toBeNull();
  });

  it("eval 4: TopReality price question", () => {
    const ev = parseEmail(EVAL_TOPREALITY, RECEIVED_AT);
    expect(ev.source).toBe("TopReality.sk");
    expect(ev.inquiryIntent).toBe("Price Question");
    expect(ev.warnings).toContain("no_listing_ref");
  });

  it("eval 5: unsubscribe is not a lead", () => {
    const ev = parseEmail(EVAL_UNSUBSCRIBE, RECEIVED_AT);
    expect(ev.eventKind).toBe("unsubscribe");
    expect(toLeadCandidate(ev, SMOLKO_AGENCY, false)).toBeNull();
    expect(toLeadCandidate(ev, SMOLKO_AGENCY, true)).toBeNull();
  });

  it("eval 6: Byty.sk availability question", () => {
    const ev = parseEmail(EVAL_BYTY, RECEIVED_AT);
    expect(ev.source).toBe("Byty.sk");
    expect(ev.inquiryIntent).toBe("Availability Question");
    const lead = toLeadCandidate(ev, SMOLKO_AGENCY, false);
    expect(lead?.phone).toBe("0905123456");
    expect(lead?.note).toContain("Availability Question");
  });
});

// ── Regresie z produkcie (Reality Smolko, 7 dopytov 2026-07 … 2026-09) ────────
// Každý prípad nižšie je skutočný lead uložený v produkčnej DB so zlým obsahom.
// Zdroj: audit 2026-09-19 nad public.leads, agency 11111111-…-111111111111.
// Mená a adresy sú SYNTETICKÉ — reprodukuje sa tvar správy, nie osobné údaje
// klientov (GDPR: do repa nepatria).

const RECIPIENT_SMOLKO = "office@realitysmolko.sk";

describe("parser regresie z produkcie", () => {
  it("HTML v tele nesmie skončiť v mene (regresia: lead 2026-09-07)", () => {
    const raw = [
      "Reality.sk - nova reakcia na inzerat",
      "<html><body><table><tr><td><b>Meno:</b> Zuzana Vzorová<br/></td></tr>",
      "<tr><td><b>E-mail:</b> zuzana.vzorova@example.com</td></tr>",
      "<tr><td><b>Telefón:</b> 0911 503 619</td></tr>",
      "<tr><td><b>Správa:</b> Dobrý deň, mám záujem o obhliadku.</td></tr>",
      "</table></body></html>",
    ].join("\n");

    const ev = parseEmail(raw, RECEIVED_AT, { recipient: RECIPIENT_SMOLKO });

    expect(ev.contactName).toBe("Zuzana Vzorová");
    expect(ev.contactName).not.toMatch(/[<>]/);
    expect(ev.contactEmail).toBe("zuzana.vzorova@example.com");
    expect(ev.contactPhone).toBe("0911503619");
    expect(ev.source).toBe("Reality.sk");

    const lead = toLeadCandidate(ev, SMOLKO_AGENCY, false);
    expect(lead?.name).toBe("Zuzana Vzorová");
  });

  it("adresa samotnej RK sa nesmie stať kontaktom záujemcu (lead 2026-09-08)", () => {
    const raw = [
      "Nehnutelnosti.sk - nova sprava",
      "Komu: office@realitysmolko.sk",
      "Meno: Peter Kráľ",
      "E-mail: peter.kral@gmail.com",
      "Sprava: máte ešte voľný ten byt?",
    ].join("\n");

    const ev = parseEmail(raw, RECEIVED_AT, { recipient: RECIPIENT_SMOLKO });
    expect(ev.contactEmail).toBe("peter.kral@gmail.com");
  });

  it("keď je v mailu iba adresa RK, nevyberie ju ako kontakt", () => {
    const raw = [
      "Nehnutelnosti.sk - nova sprava",
      "Komu: office@realitysmolko.sk",
      "Sprava: záujem o obhliadku",
      "Telefon: 0905 123 456",
    ].join("\n");

    const ev = parseEmail(raw, RECEIVED_AT, { recipient: RECIPIENT_SMOLKO });
    expect(ev.contactEmail).toBeNull();
    expect(ev.contactPhone).toBe("0905123456"); // kontakt drží telefón
  });

  it("noreply portálu nie je kontakt záujemcu", () => {
    const raw = [
      "bazos.sk",
      "Od: noreply@bazos.sk",
      "E-mail: kupujuci@gmail.com",
      "Sprava: inzerat 181012929 je aktualny?",
    ].join("\n");

    const ev = parseEmail(raw, RECEIVED_AT, { recipient: RECIPIENT_SMOLKO });
    expect(ev.contactEmail).toBe("kupujuci@gmail.com");
  });

  it("odstráni koncovú bodku v adrese (regresia: lead 2026-09-19)", () => {
    const raw = [
      "Nehnutelnosti.sk",
      "Meno: Jozef Vzorný",
      "Sprava: ozvite sa prosím na jozef.vzorny@example.sk.",
    ].join("\n");

    const ev = parseEmail(raw, RECEIVED_AT, { recipient: RECIPIENT_SMOLKO });
    expect(ev.contactEmail).toBe("jozef.vzorny@example.sk");
  });

  it("htmlToText je na čistom texte no-op (chráni existujúce rawHash)", () => {
    expect(htmlToText(EVAL_NEHNUTELNOSTI)).toBe(EVAL_NEHNUTELNOSTI);
    expect(htmlToText(EVAL_BAZOS_PALENCAR)).toBe(EVAL_BAZOS_PALENCAR);
  });

  it("rawHash sa počíta z pôvodného raw, nie z normalizovaného textu", () => {
    const plain = "byty.sk\nMeno: A B\nE-mail: a@b.sk";
    const html = "byty.sk<br/>Meno: A B<br/>E-mail: a@b.sk";
    const a = parseEmail(plain, RECEIVED_AT);
    const b = parseEmail(html, RECEIVED_AT);
    expect(a.contactName).toBe(b.contactName); // polia rovnaké
    expect(a.rawHash).not.toBe(b.rawHash); // hash rozdielny -> idempotencia zachovaná
  });
});
