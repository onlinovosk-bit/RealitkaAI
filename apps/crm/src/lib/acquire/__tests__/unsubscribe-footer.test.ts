import { describe, expect, it } from "vitest";
import { notLeadReason, parseEmail, toLeadCandidate } from "../email-adapter";

/**
 * PROD incident: no lead since 2026-09-22 while mail kept arriving. Cause —
 * nehnutelnosti.sk notifications carry an "Odhlásiť sa z odberu" footer, and
 * the parser treated that word anywhere in the body as an unsubscribe. Every
 * real inquiry was dropped as NOT_A_LEAD (founder confirmed one in the mailbox).
 */

const AGENCY = "11111111-1111-1111-1111-111111111111";
const SUBJECT = "Nová správa k inzerátu na Nehnuteľnosti.sk";
const BODY = `Meno: Jan Novak
E-mail: jan.novak@example.com
Telefon: +421 912 345 678
Sprava: Chcem obhliadku co najskor
PO12345X`;
const FOOTER = "Ak si neželáte dostávať tieto správy, môžete sa odhlásiť z odberu.";

/** Exactly how the route builds the parser input. */
function asRoute(subject: string, body: string) {
  return { raw: [subject, body, ""].join("\n"), subject };
}

describe("unsubscribe footer must not kill a real inquiry", () => {
  it("portal inquiry with an 'odhlásiť' footer is still a lead", () => {
    const { raw, subject } = asRoute(SUBJECT, `${BODY}\n${FOOTER}`);
    const ev = parseEmail(raw, "2026-09-28", { subject });

    expect(ev.eventKind).toBe("inquiry");
    expect(ev.source).toBe("Nehnuteľnosti.sk");
    expect(notLeadReason(ev, false)).toBeNull();
    expect(toLeadCandidate(ev, AGENCY, false)).not.toBeNull();
  });

  it("the same mail without the footer behaves identically (footer changes nothing)", () => {
    const withFooter = asRoute(SUBJECT, `${BODY}\n${FOOTER}`);
    const without = asRoute(SUBJECT, BODY);

    const a = parseEmail(withFooter.raw, "2026-09-28", { subject: withFooter.subject });
    const b = parseEmail(without.raw, "2026-09-28", { subject: without.subject });

    expect(a.eventKind).toBe(b.eventKind);
    expect(a.contactEmail).toBe(b.contactEmail);
    expect(a.contactPhone).toBe(b.contactPhone);
  });

  it("an English 'unsubscribe' footer is equally harmless", () => {
    const { raw, subject } = asRoute(SUBJECT, `${BODY}\nClick here to unsubscribe.`);
    expect(parseEmail(raw, "2026-09-28", { subject }).eventKind).toBe("inquiry");
  });

  it("a genuine unsubscribe — named in the subject — is still not a lead", () => {
    const { raw, subject } = asRoute("Odhlásenie z odberu noviniek", "E-mail: x@y.sk");
    const ev = parseEmail(raw, "2026-09-28", { subject });

    expect(ev.eventKind).toBe("unsubscribe");
    expect(notLeadReason(ev, false)).toBe("not_inquiry");
    expect(toLeadCandidate(ev, AGENCY, false)).toBeNull();
  });

  it("a body-only unsubscribe with no contact at all is still not a lead", () => {
    const { raw, subject } = asRoute("Info", "Boli ste odhlásený z odberu.");
    expect(parseEmail(raw, "2026-09-28", { subject }).eventKind).toBe("unsubscribe");
  });

  it("without an explicit subject the first line is used (legacy callers)", () => {
    expect(parseEmail("unsubscribe from list\nE-mail: x@y.sk", "2026-09-28").eventKind).toBe(
      "unsubscribe",
    );
    expect(parseEmail(`${SUBJECT}\n${BODY}\n${FOOTER}`, "2026-09-28").eventKind).toBe("inquiry");
  });
});
