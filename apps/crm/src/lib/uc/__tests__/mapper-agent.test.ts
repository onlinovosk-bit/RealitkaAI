import { describe, expect, it } from "vitest";
import { UC_DOC_AGENT_SAMPLE } from "@/lib/uc/fixtures";
import { mapUcAgentPayload } from "@/lib/uc/mapper-agent";

describe("mapUcAgentPayload", () => {
  it("maps documented agent fixture with phone normalization", () => {
    const mapped = mapUcAgentPayload({ ...UC_DOC_AGENT_SAMPLE });

    expect(mapped.externalId).toBe("testImport");
    expect(mapped.fullName).toBe("Testovací Maklér");
    expect(mapped.phone).toBe("+421912345678");
    expect(mapped.phoneStatus).toBe("sk");
    expect(mapped.email).toBe("mail@mail.mm");
    expect(mapped.sora).toBe(true);
    expect(mapped.nark).toBe(false);
    expect(mapped.deleted).toBe(false);
    expect(mapped.image.url).toContain("users-photos");
    expect(mapped.image.changed).toBe(false);
  });

  it("flags deleted agents for soft-delete flow", () => {
    const mapped = mapUcAgentPayload({
      ...UC_DOC_AGENT_SAMPLE,
      deleted: 1,
    });

    expect(mapped.deleted).toBe(true);
  });

  it("requires user_id", () => {
    expect(() =>
      mapUcAgentPayload({
        full_name: "Bez ID",
        phone_work: "0911111111",
        email_work: "a@b.sk",
        deleted: 0,
      }),
    ).toThrow(/user_id/);
  });
});
