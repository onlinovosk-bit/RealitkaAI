// ================================================================
// BOD 9 — minimalizácia osobných údajov pred volaním LLM.
// Audit: docs/reports/2026-09-29-llm-callsite-pii-audit.md (19 miest MINIMIZE).
// ================================================================
import { describe, expect, it } from "vitest";
import { NAME_PLACEHOLDER, cityOnly, firstNameOnly, restoreName } from "../minimize";

describe("firstNameOnly", () => {
  it("vráti krstné meno z celého mena", () => {
    expect(firstNameOnly("Peter Novák")).toBe("Peter");
    expect(firstNameOnly("Mária Anna Kováčová")).toBe("Mária");
  });

  it("preskočí titul pred menom", () => {
    expect(firstNameOnly("Ing. Peter Novák")).toBe("Peter");
    expect(firstNameOnly("JUDr. Mária Kováčová")).toBe("Mária");
    expect(firstNameOnly("doc. Ing. Ján Hruška")).toBe("Ján");
  });

  it("prázdny alebo chýbajúci vstup nevráti undefined", () => {
    // Do promptu sa nesmie dostať "undefined" ani "null" ako text.
    for (const vstup of [null, undefined, "", "   ", ".", "Ing."]) {
      expect(firstNameOnly(vstup)).toBe("");
    }
  });

  it("priezvisko neprepustí", () => {
    expect(firstNameOnly("Peter Novák")).not.toContain("Novák");
  });

  it("neobmedzene dlhý vstup oreže", () => {
    expect(firstNameOnly("A".repeat(200)).length).toBe(40);
  });
});

describe("cityOnly", () => {
  it("z plnej adresy vráti iba mesto", () => {
    expect(cityOnly("Hlavná 25, 811 01 Bratislava")).toBe("Bratislava");
    expect(cityOnly("Štúrova 7, 040 01 Košice")).toBe("Košice");
  });

  it("mestskú časť ponechá", () => {
    expect(cityOnly("Nám. SNP 1, 851 01 Bratislava-Petržalka")).toBe("Bratislava-Petržalka");
  });

  it("keď sa mesto nedá oddeliť, radšej nevráti nič než ulicu", () => {
    // Bez čiarky sa ulica a číslo domu od mesta oddeliť nedajú.
    expect(cityOnly("Hlavná 25 Bratislava 81101")).toBe("");
    expect(cityOnly("Hlavná 25")).toBe("");
  });

  it("prázdny vstup vráti prázdny reťazec", () => {
    for (const vstup of [null, undefined, "", "  ", ","]) {
      expect(cityOnly(vstup)).toBe("");
    }
  });

  it("číslo domu neprepustí nikdy", () => {
    for (const adresa of [
      "Hlavná 25, 811 01 Bratislava",
      "Štúrova 7, 040 01 Košice",
      "Nám. SNP 1, 851 01 Bratislava-Petržalka",
    ]) {
      expect(cityOnly(adresa)).not.toMatch(/\d/);
    }
  });
});

describe("restoreName — meno sa dosádza až po odpovedi modelu", () => {
  it("nahradí zástupný znak skutočným menom", () => {
    expect(restoreName(`Dobrý deň ${NAME_PLACEHOLDER}, ďakujeme.`, "Peter Novák")).toBe(
      "Dobrý deň Peter Novák, ďakujeme.",
    );
  });

  it("bez mena odstráni zástupný znak aj prebytočnú medzeru", () => {
    expect(restoreName(`Dobrý deň ${NAME_PLACEHOLDER}, ďakujeme.`, "")).toBe("Dobrý deň, ďakujeme.");
    expect(restoreName(`Dobrý deň ${NAME_PLACEHOLDER}, ďakujeme.`, null)).toBe("Dobrý deň, ďakujeme.");
  });

  it("nahradí všetky výskyty, nielen prvý", () => {
    const out = restoreName(`${NAME_PLACEHOLDER} ... ${NAME_PLACEHOLDER}`, "Eva");
    expect(out).toBe("Eva ... Eva");
  });

  it("text bez zástupného znaku nechá na pokoji", () => {
    expect(restoreName("Dobrý deň, ďakujeme.", "Peter")).toBe("Dobrý deň, ďakujeme.");
  });

  it("zástupný znak nikdy neostane v texte pre klienta", () => {
    for (const meno of ["Peter", "", null, undefined]) {
      expect(restoreName(`Ahoj ${NAME_PLACEHOLDER}!`, meno)).not.toContain(NAME_PLACEHOLDER);
    }
  });
});
