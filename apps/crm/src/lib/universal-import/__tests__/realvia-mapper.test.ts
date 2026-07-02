import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { mapRealviaClientToRevolis } from "@/lib/universal-import/realvia/map-realvia-client";
import { parseRealviaJsonText } from "@/lib/universal-import/realvia/realvia-schema";

const AGENCY = "11111111-1111-1111-1111-111111111111";
const FIXTURE = resolve(__dirname, "../__fixtures__/realvia/clients.json");

describe("mapRealviaClientToRevolis", () => {
  const { clients } = parseRealviaJsonText(readFileSync(FIXTURE, "utf8"));

  it("maps vlastnik with notes and inspection activities", () => {
    const mapped = mapRealviaClientToRevolis(clients[0], AGENCY, 0);

    expect(mapped.lead.name).toBe("Ján Novák");
    expect(mapped.lead.status).toBe("Vlastník");
    expect(mapped.lead.do_not_contact).toBe(false);
    expect(mapped.activities).toHaveLength(2);
    expect(mapped.activities[0].type).toBe("Poznámka");
    expect(mapped.activities[1].type).toBe("Obhliadka");
  });

  it("maps archived finished zaujemca", () => {
    const mapped = mapRealviaClientToRevolis(clients[1], AGENCY, 1);

    expect(mapped.lead.status).toBe("Archivovaný");
    expect(mapped.lead.archived).toBe(true);
    expect(mapped.lead.note).toContain("archivovaný");
  });

  it("sets do-not-contact for blacklist", () => {
    const mapped = mapRealviaClientToRevolis(clients[2], AGENCY, 2);

    expect(mapped.lead.do_not_contact).toBe(true);
    expect(mapped.lead.status).toBe("Neoslovovať");
    expect(mapped.lead.note).toContain("DO-NOT-CONTACT");
  });

  it("allows phone-only contact without email", () => {
    const mapped = mapRealviaClientToRevolis(clients[3], AGENCY, 3);

    expect(mapped.skipReason).toBeUndefined();
    expect(mapped.lead.email).toBe("");
    expect(mapped.lead.phone).toBe("0915123456");
  });

  it("preserves diacritics in name and address", () => {
    const mapped = mapRealviaClientToRevolis(clients[4], AGENCY, 4);

    expect(mapped.lead.name).toBe("Ľudovít Šťastný");
    expect(mapped.lead.location).toContain("Banská Bystrica");
  });

  it("maps multiple inspections", () => {
    const mapped = mapRealviaClientToRevolis(clients[5], AGENCY, 5);

    expect(mapped.activities.filter((a) => a.type === "Obhliadka")).toHaveLength(3);
    expect(mapped.lead.note).toBe("");
  });

  it("produces stable external keys and lead ids", () => {
    const a = mapRealviaClientToRevolis(clients[0], AGENCY, 0);
    const b = mapRealviaClientToRevolis(clients[0], AGENCY, 0);

    expect(a.externalKey).toBe(b.externalKey);
    expect(a.lead.id).toBe(b.lead.id);
  });
});
