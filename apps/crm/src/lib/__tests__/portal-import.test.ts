// ================================================================
// BOD 5 (zadanie foundera 2026-10-15) — rozsah importu.
//
// Portálový import mal tri chyby, ktoré spolu znamenali, že cez túto cestu
// neprišiel na PROD ani jeden lead (zmerané 2026-10-15: `source='Portal Import'`
// = 0 riadkov pri 523 leadoch celkovo):
//   1. INSERT bez `agency_id` → RLS zápis odmietne, chyba sa preložila na
//      „0 importovaných" a vyzerala ako zlý súbor,
//   2. `line.split(",")` → hodnota v úvodzovkách s čiarkou rozhodila riadok,
//   3. jeden INSERT pre všetky riadky → jeden chybný riadok zahodil import celý.
// ================================================================
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  inserted: [] as Record<string, unknown>[][],
  insertError: null as { message: string } | null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      insert: (rows: Record<string, unknown>[]) => {
        mocks.inserted.push(rows);
        return Promise.resolve({ error: mocks.insertError });
      },
    }),
  }),
}));

import { importPortalLeadsFromCsv } from "@/lib/integrations-store";

const AGENCY = "11111111-1111-1111-1111-111111111111";
const posledny = () => mocks.inserted.at(-1) ?? [];

beforeEach(() => {
  mocks.inserted = [];
  mocks.insertError = null;
});

describe("agency_id — bez neho RLS zápis odmietne", () => {
  it("každý vložený riadok nesie agency_id", async () => {
    const res = await importPortalLeadsFromCsv("name,email\nPeter Novák,p@example.sk\n", AGENCY);
    expect(res.imported).toBe(1);
    expect(posledny()[0]).toMatchObject({ agency_id: AGENCY, name: "Peter Novák" });
  });

  it("chýbajúce agency_id nič nevloží a povie prečo", async () => {
    const res = await importPortalLeadsFromCsv("name\nPeter\n", "");
    expect(res.imported).toBe(0);
    expect(mocks.inserted).toHaveLength(0);
    expect(res.errorRows[0]?.reason).toContain("agency_id");
  });
});

describe("parser — úvodzovky s čiarkou už riadok nerozhodia", () => {
  it('"Bratislava, Staré Mesto" zostane jednou hodnotou', async () => {
    const csv = 'name,location,email\nPeter Novák,"Bratislava, Staré Mesto",p@example.sk\n';
    const res = await importPortalLeadsFromCsv(csv, AGENCY);
    expect(res.imported).toBe(1);
    expect(posledny()[0]).toMatchObject({
      name: "Peter Novák",
      location: "Bratislava, Staré Mesto",
      email: "p@example.sk",
    });
  });

  it("slovenské hlavičky fungujú rovnako ako anglické", async () => {
    const res = await importPortalLeadsFromCsv("meno,telefón\nEva Horváthová,+421903123456\n", AGENCY);
    expect(res.imported).toBe(1);
    expect(posledny()[0]).toMatchObject({ name: "Eva Horváthová", phone: "+421903123456" });
  });
});

describe("chybný riadok nezahodí celý import", () => {
  it("dobré riadky prejdú, chybné sa vrátia s číslom riadku", async () => {
    // Druhý riadok nemá meno ani kontakt — jeden zlý riadok nesmie zahodiť zvyšok.
    const csv = "name,email\nPeter Novák,p@example.sk\n,\nEva Horváthová,e@example.sk\n";
    const res = await importPortalLeadsFromCsv(csv, AGENCY);
    expect(res.imported).toBe(2);
    expect(posledny()).toHaveLength(2);
  });

  it("riadok bez kontaktu sa vráti ako chyba, nie ticho", async () => {
    const res = await importPortalLeadsFromCsv("name,email\nPeter Novák,\n", AGENCY);
    expect(res.imported).toBe(0);
    expect(res.errors).toBe(1);
    expect(res.errorRows).toHaveLength(1);
    // +2, lebo riadok 1 je hlavička — číslo musí sedieť s tabuľkovým editorom.
    expect(res.errorRows[0]?.row).toBe(2);
  });

  it("chyba zápisu sa vráti aj s textom z databázy", async () => {
    mocks.insertError = { message: "new row violates row-level security policy" };
    const res = await importPortalLeadsFromCsv("name,email\nPeter,p@example.sk\n", AGENCY);
    expect(res.imported).toBe(0);
    expect(res.errorRows[0]?.reason).toContain("row-level security");
  });
});

describe("hranice rozsahu", () => {
  it("prázdny vstup nič nerobí", async () => {
    for (const csv of ["", "   ", "name,email\n"]) {
      const res = await importPortalLeadsFromCsv(csv, AGENCY);
      expect(res.imported).toBe(0);
    }
    expect(mocks.inserted).toHaveLength(0);
  });

  it("nad limit riadkov sa nevloží nič a limit je v chybe", async () => {
    const csv = "name,email\n" + Array.from({ length: 2001 }, (_, i) => `Lead ${i},l${i}@e.sk`).join("\n");
    const res = await importPortalLeadsFromCsv(csv, AGENCY);
    expect(res.imported).toBe(0);
    expect(mocks.inserted).toHaveLength(0);
    expect(res.errorRows[0]?.reason).toContain("2000");
  });
});
