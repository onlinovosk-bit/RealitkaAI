import { describe, expect, it } from "vitest";
import {
  DATASET_VERSION,
  PARSER_VERSION,
  dedupKey,
  parseEmail,
  toLeadCandidate,
} from "../email-adapter";

const RECEIVED_AT = "2026-06-29T10:00:00Z";

const NEHNUTELNOSTI_RAW = `nehnutelnosti.sk notification
Meno: Jan Novak
E-mail: jan@example.com
Telefon: +421 912 345 678
Sprava: Chcem obhliadku co najskor
Internal PO12345X test
`;

const SMOLKO_RAW = `formular@realitysmolko.sk
Meno a priezvisko: Maria Kova
E-mail: maria@test.sk
Telefon: 0911222333
Sprava: Informacie o cene prosim
Odoslane z: 3-izbovy byt Poprad
`;

describe("email-adapter", () => {
  it("exports version constants", () => {
    expect(PARSER_VERSION).toBe("1.2");
    expect(DATASET_VERSION).toBe("1");
  });

  it("detects Nehnutelnosti portal source and viewing intent", () => {
    const ev = parseEmail(NEHNUTELNOSTI_RAW, RECEIVED_AT);
    expect(ev.source_type).toBe("Portal");
    expect(ev.source).toBe("Nehnuteľnosti.sk");
    expect(ev.inquiry_intent).toBe("Viewing Request");
    expect(ev.event_kind).toBe("inquiry");
  });

  it("extracts contact fields from labeled portal mail", () => {
    const ev = parseEmail(NEHNUTELNOSTI_RAW, RECEIVED_AT);
    expect(ev.contact_name).toBe("Jan Novak");
    expect(ev.contact_email).toBe("jan@example.com");
    expect(ev.contact_phone).toBe("+421912345678");
    expect(ev.listing_internal_id).toBe("PO12345X");
  });

  it("detects Smolko web form source and listing title fallback", () => {
    const ev = parseEmail(SMOLKO_RAW, RECEIVED_AT);
    expect(ev.source_type).toBe("Website");
    expect(ev.source).toBe("realitysmolko.sk (web formulár)");
    expect(ev.listing_title).toBe("3-izbovy byt Poprad");
    expect(ev.inquiry_intent).toBe("Information Request");
  });

  it("classifies unsubscribe event_kind", () => {
    const ev = parseEmail("unsubscribe from list\nE-mail: x@y.sk\n", RECEIVED_AT);
    expect(ev.event_kind).toBe("unsubscribe");
    expect(ev.source).toBe("Unknown");
  });

  it("dedupKey is deterministic for same event", () => {
    const ev = parseEmail(SMOLKO_RAW, RECEIVED_AT);
    expect(dedupKey(ev)).toBe("729671c986f5863d");
    expect(dedupKey(ev)).toBe(dedupKey(ev));
  });

  it("dedupKey differs when contact or listing changes", () => {
    const a = parseEmail(SMOLKO_RAW, RECEIVED_AT);
    const b = parseEmail(SMOLKO_RAW.replace("maria@test.sk", "other@test.sk"), RECEIVED_AT);
    expect(dedupKey(a)).not.toBe(dedupKey(b));
  });

  it("toLeadCandidate maps portal mail to portal: source", () => {
    const ev = parseEmail(NEHNUTELNOSTI_RAW, RECEIVED_AT);
    const candidate = toLeadCandidate(ev, false);
    expect(candidate?.source).toBe("portal:Nehnuteľnosti.sk");
    expect(candidate?.status).toBe("Nový");
    expect(candidate?.agency_id).toBeNull();
  });

  it("toLeadCandidate maps website mail to web_form source", () => {
    const ev = parseEmail(SMOLKO_RAW, RECEIVED_AT);
    const candidate = toLeadCandidate(ev, false);
    expect(candidate?.source).toBe("web_form");
    expect(candidate?.email).toBe("maria@test.sk");
  });

  it("toLeadCandidate returns null when duplicate flag is set", () => {
    const ev = parseEmail(SMOLKO_RAW, RECEIVED_AT);
    expect(toLeadCandidate(ev, true)).toBeNull();
  });

  it("toLeadCandidate returns null for unsubscribe events", () => {
    const ev = parseEmail("unsubscribe\nE-mail: x@y.sk\n", RECEIVED_AT);
    expect(toLeadCandidate(ev, false)).toBeNull();
  });

  it("toLeadCandidate returns null for unknown source", () => {
    const ev = parseEmail("Random mail\nE-mail: a@b.sk\nTelefon: 0911111111\n", RECEIVED_AT);
    expect(toLeadCandidate(ev, false)).toBeNull();
  });

  it("toLeadCandidate returns null when no contact present", () => {
    const ev = parseEmail("nehnutelnosti.sk\nSprava: hello\nPO12345X", RECEIVED_AT);
    expect(toLeadCandidate(ev, false)).toBeNull();
  });

  it("parseEmail attaches validation warnings", () => {
    const ev = parseEmail("nehnutelnosti.sk\nE-mail: jan@example.com\n", RECEIVED_AT);
    expect(ev.warnings).toContain("no_listing_ref");
  });

  it("note includes intent reason for lead candidate", () => {
    const ev = parseEmail(SMOLKO_RAW, RECEIVED_AT);
    const candidate = toLeadCandidate(ev, false);
    expect(candidate?.note).toContain("intent: Information Request");
    expect(candidate?.note).toContain("3-izbovy byt Poprad");
  });
});
