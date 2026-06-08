import { describe, expect, it } from "vitest";
import {
  mapContactFromRow,
  mappedContactToLeadInsert,
  validateMappedContact,
} from "@/lib/universal-import/map-contact";

describe("mapContactFromRow", () => {
  it("combines Meno and Priezvisko into contact_name", () => {
    const mapped = mapContactFromRow(
      {
        Meno: "Rastislav",
        Priezvisko: "Smolko",
        Telefon: "0905123456",
        Email: "test@example.sk",
      },
      {
        Meno: "contact_name",
        Priezvisko: "contact_name",
        Telefon: "phone",
        Email: "email",
      },
    );

    expect(mapped.contact_name).toBe("Rastislav Smolko");
    expect(mapped.phone).toBe("0905123456");
    expect(mapped.email).toBe("test@example.sk");
  });

  it("returns missing_name when no name columns mapped", () => {
    const mapped = mapContactFromRow(
      { Telefon: "0905123456" },
      { Telefon: "phone" },
    );
    expect(validateMappedContact(mapped)).toBe("missing_name");
  });

  it("returns missing_contact when name exists but no phone/email", () => {
    const mapped = mapContactFromRow(
      { Meno: "Ján" },
      { Meno: "contact_name" },
    );
    expect(validateMappedContact(mapped)).toBe("missing_contact");
  });

  it("maps to lead insert payload", () => {
    const lead = mappedContactToLeadInsert(
      {
        contact_name: "Ján Novák",
        email: "jan@example.sk",
        phone: "+421900111222",
        address: "Bratislava",
        budget: 250000,
      },
      "11111111-1111-1111-1111-111111111111",
      "Universal Import — Realvia CRM",
    );

    expect(lead.name).toBe("Ján Novák");
    expect(lead.agency_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(lead.budget).toBe("250000");
    expect(lead.source).toBe("Universal Import — Realvia CRM");
  });
});
