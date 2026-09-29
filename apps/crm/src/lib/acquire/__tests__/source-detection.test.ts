import { describe, expect, it } from "vitest";
import {
  notLeadDiagnostics,
  notLeadReason,
  parseEmail,
  senderDomainOf,
  toLeadCandidate,
} from "../email-adapter";

/**
 * SOURCE-FROM: rozpoznanie zdroja stálo výlučne na texte mailu. Keby portál
 * prestal uvádzať svoj názov v predmete a tele, `source` spadne na `Unknown`,
 * každý dopyt sa zahodí ako `NOT_A_LEAD` — a nič by o tom nepovedalo. Presne
 * tá istá trieda tichej chyby ako pätička „odhlásiť" (#732). Adresa
 * odosielateľa je druhý, nezávislý signál.
 */

const AGENCY = "11111111-1111-1111-1111-111111111111";
/** Telo bez jedinej zmienky o portáli — stav, ktorý dnes zastaví príjem. */
const ANONYMOUS_BODY = `Nová správa k vášmu inzerátu
Meno: Jan Novak
E-mail: jan.novak@example.com
Telefon: +421 912 345 678
Sprava: Chcem obhliadku co najskor
PO12345X`;

function parse(body: string, from?: string) {
  return parseEmail(body, "2026-09-29", { subject: body.split("\n")[0], from });
}

describe("senderDomainOf", () => {
  it("číta doménu z holej adresy aj z tvaru so zobrazovaným menom", () => {
    expect(senderDomainOf("noreply@nehnutelnosti.sk")).toBe("nehnutelnosti.sk");
    expect(senderDomainOf("Nehnuteľnosti.sk <NoReply@Nehnutelnosti.SK>")).toBe("nehnutelnosti.sk");
  });

  it("chýbajúca alebo nezmyselná hlavička nie je doména", () => {
    for (const v of [null, undefined, "", "   ", "nie je adresa"]) {
      expect(senderDomainOf(v)).toBeNull();
    }
  });
});

describe("zdroj podľa odosielateľa, keď ho text neprezradí", () => {
  it("bez odosielateľa je to dnešný tichý výpadok: Unknown → nie je lead", () => {
    const ev = parse(ANONYMOUS_BODY);
    expect(ev.source).toBe("Unknown");
    expect(ev.sourceDetectedBy).toBe("none");
    expect(notLeadReason(ev, false)).toBe("unknown_source");
    expect(toLeadCandidate(ev, AGENCY, false)).toBeNull();
  });

  it("s odosielateľom z portálu ten istý mail leadom je", () => {
    const ev = parse(ANONYMOUS_BODY, "Nehnuteľnosti.sk <noreply@nehnutelnosti.sk>");
    expect(ev.source).toBe("Nehnuteľnosti.sk");
    expect(ev.sourceType).toBe("Portal");
    expect(ev.sourceDetectedBy).toBe("sender");
    expect(notLeadReason(ev, false)).toBeNull();
    expect(toLeadCandidate(ev, AGENCY, false)?.source).toBe("portal:Nehnuteľnosti.sk");
  });

  it("záchrana cez odosielateľa je varovanie, nie ticho", () => {
    expect(parse(ANONYMOUS_BODY, "noreply@nehnutelnosti.sk").warnings).toContain("source_from_sender");
    expect(parse(`Nehnutelnosti.sk\n${ANONYMOUS_BODY}`, "noreply@nehnutelnosti.sk").warnings).not.toContain(
      "source_from_sender",
    );
  });

  it("subdoména portálu sa počíta, podvrhnutá doména nie", () => {
    expect(parse(ANONYMOUS_BODY, "noreply@mail.nehnutelnosti.sk").source).toBe("Nehnuteľnosti.sk");
    expect(parse(ANONYMOUS_BODY, "noreply@nehnutelnosti.sk.evil.com").source).toBe("Unknown");
    expect(parse(ANONYMOUS_BODY, "noreply@xnehnutelnosti.sk").source).toBe("Unknown");
  });

  it("web formulár klienta sa rozpozná aj podľa domény odosielateľa", () => {
    const ev = parse(ANONYMOUS_BODY, "formular@realitysmolko.sk");
    expect(ev.sourceType).toBe("Website");
    expect(toLeadCandidate(ev, AGENCY, false)?.source).toBe("web_form");
  });

  it("neznámy odosielateľ nič nevymýšľa", () => {
    const ev = parse(ANONYMOUS_BODY, "sused@example.com");
    expect(ev.source).toBe("Unknown");
    expect(ev.sourceDetectedBy).toBe("none");
  });
});

describe("text zostáva primárnym signálom", () => {
  const BODY = `Nehnutelnosti.sk notification\n${ANONYMOUS_BODY}`;

  it("text rozhoduje aj vtedy, keď odosielateľ ukazuje inam", () => {
    const ev = parse(BODY, "noreply@bazos.sk");
    expect(ev.source).toBe("Nehnuteľnosti.sk");
    expect(ev.sourceDetectedBy).toBe("text");
  });

  it("mail s názvom portálu v texte sa bez `from` správa presne ako predtým", () => {
    const withFrom = parse(BODY, "noreply@nehnutelnosti.sk");
    const without = parse(BODY);
    expect(without.source).toBe(withFrom.source);
    expect(without.sourceType).toBe(withFrom.sourceType);
    expect(without.sourceDetectedBy).toBe("text");
    expect(without.contactEmail).toBe(withFrom.contactEmail);
    expect(without.rawHash).toBe(withFrom.rawHash);
    expect(without.eventId).toBe(withFrom.eventId);
  });
});

describe("diagnostika", () => {
  it("povie, ako sa zdroj rozpoznal, a neprezradí odosielateľa", () => {
    const ev = parse(ANONYMOUS_BODY, "Ján Novák <jan.novak@nehnutelnosti.sk>");
    expect(notLeadDiagnostics(ev)).toMatchObject({
      source: "Nehnuteľnosti.sk",
      source_detected_by: "sender",
      has_sender: true,
    });
    const logged = JSON.stringify(notLeadDiagnostics(ev));
    // Zdroj sa pomenovať smie; adresa odosielateľa nie.
    for (const pii of ["jan.novak", "Novák", "912"]) {
      expect(logged).not.toContain(pii);
    }
  });

  it("bez hlavičky From to v logu vidno — Worker ju zatiaľ neposiela", () => {
    expect(notLeadDiagnostics(parse(ANONYMOUS_BODY))).toMatchObject({
      has_sender: false,
      source_detected_by: "none",
    });
  });
});
