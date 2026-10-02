import { describe, expect, it } from "vitest";
import { mailboxLogEvent, pickAgencyMailbox } from "../mailbox-routing";

describe("mailboxLogEvent", () => {
  it("chýbajúce `to` → to_missing", () => {
    expect(mailboxLogEvent({ mailbox: null, rowFound: false, hasOwner: false })).toBe("to_missing");
  });
  it("riadok existuje bez makléra → to_agency_mailbox (nie chyba)", () => {
    expect(mailboxLogEvent({ mailbox: "a@x.sk", rowFound: true, hasOwner: false })).toBe("to_agency_mailbox");
  });
  it("riadok neexistuje → to_unmatched", () => {
    expect(mailboxLogEvent({ mailbox: "a@x.sk", rowFound: false, hasOwner: false })).toBe("to_unmatched");
  });
  it("priradený makléř → nič sa nelogguje", () => {
    expect(mailboxLogEvent({ mailbox: "a@x.sk", rowFound: true, hasOwner: true })).toBeNull();
  });
});

describe("pickAgencyMailbox", () => {
  const broker = { email: "aa-broker@x.sk", profile_id: "p1" };
  it("nikdy nevyberie maklérsku adresu, aj keď je abecedne prvá", () => {
    expect(pickAgencyMailbox([broker, { email: "zz-agency@x.sk", profile_id: null }])).toBe("zz-agency@x.sk");
  });
  it("je nezávislý od poradia riadkov", () => {
    const a = { email: "b@x.sk", profile_id: null };
    const b = { email: "a@x.sk", profile_id: null };
    expect(pickAgencyMailbox([a, b])).toBe("a@x.sk");
    expect(pickAgencyMailbox([b, a])).toBe("a@x.sk");
  });
  it("bez agentúrnej adresy → null (radšej mailbox_not_found než náhodný makléř)", () => {
    expect(pickAgencyMailbox([broker])).toBeNull();
    expect(pickAgencyMailbox([])).toBeNull();
  });
});
