import { describe, expect, it } from "vitest";
import { notLeadDiagnostics, notLeadReason, parseEmail, toLeadCandidate } from "../email-adapter";

/**
 * INBOUND-NOTALEAD-01: every rejected e-mail must say why, without logging
 * who wrote it. Mail keeps arriving, but no lead since 2026-09-22 — the reason
 * field is what tells a parser miss from genuine non-leads.
 */

const AGENCY = "11111111-1111-1111-1111-111111111111";
const INQUIRY = `nehnutelnosti.sk notification
Meno: Jan Novak
E-mail: jan.novak@example.com
Telefon: +421 912 345 678
Sprava: Chcem obhliadku co najskor
PO12345X`;

describe("notLeadReason", () => {
  it("a real portal inquiry is a lead (null reason, candidate built)", () => {
    const ev = parseEmail(INQUIRY, "2026-09-28");
    expect(notLeadReason(ev, false)).toBeNull();
    expect(toLeadCandidate(ev, AGENCY, false)).not.toBeNull();
  });

  it("duplicate", () => {
    expect(notLeadReason(parseEmail(INQUIRY, "2026-09-28"), true)).toBe("duplicate");
  });

  it("not_inquiry — any 'odhlásiť' / unsubscribe text flips the event kind", () => {
    const ev = parseEmail(`${INQUIRY}\nOdhlásiť odber noviniek`, "2026-09-28");
    expect(notLeadReason(ev, false)).toBe("not_inquiry");
    expect(toLeadCandidate(ev, AGENCY, false)).toBeNull();
  });

  it("no_contact", () => {
    const ev = parseEmail("nehnutelnosti.sk notification\nSprava: Dobrý deň", "2026-09-28");
    expect(notLeadReason(ev, false)).toBe("no_contact");
  });

  it("unknown_source", () => {
    const ev = parseEmail("Meno: Jan\nE-mail: jan.novak@example.com\nSprava: ahoj", "2026-09-28");
    expect(notLeadReason(ev, false)).toBe("unknown_source");
  });

  it("agrees with toLeadCandidate on every case", () => {
    const cases = [INQUIRY, `${INQUIRY}\nunsubscribe`, "nehnutelnosti.sk\nahoj", "E-mail: a@example.com"];
    for (const raw of cases) {
      for (const dup of [false, true]) {
        const ev = parseEmail(raw, "2026-09-28");
        expect(notLeadReason(ev, dup) === null).toBe(toLeadCandidate(ev, AGENCY, dup) !== null);
      }
    }
  });
});

describe("notLeadDiagnostics", () => {
  it("carries only technical flags — no name, address, phone or message text", () => {
    const ev = parseEmail(`${INQUIRY}\nOdhlásiť`, "2026-09-28");
    const logged = JSON.stringify(notLeadDiagnostics(ev));
    for (const pii of ["Jan", "Novak", "jan.novak@example.com", "912", "obhliadku", "PO12345X"]) {
      expect(logged).not.toContain(pii);
    }
    expect(notLeadDiagnostics(ev)).toMatchObject({
      source: "Nehnuteľnosti.sk",
      source_type: "Portal",
      event_kind: "unsubscribe",
      has_contact_email: true,
      has_contact_phone: true,
      has_listing_ref: true,
      has_message: true,
    });
  });
});
