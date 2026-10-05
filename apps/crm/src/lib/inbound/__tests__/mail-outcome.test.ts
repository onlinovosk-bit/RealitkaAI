import { describe, expect, it, vi } from "vitest";
import { buildMailOutcomeRow, recordInboundMailOutcome } from "../mail-outcome";

const diagnostics = {
  source: "Unknown", source_type: "Unknown", event_kind: "inquiry",
  has_contact_email: true, has_contact_phone: false, has_listing_ref: true, has_message: false,
  source_detected_by: "none", sender_domain: "pima.sk", parser_version: "1.4",
} as never;

describe("buildMailOutcomeRow", () => {
  it("nesie len doménu a príznaky — žiadnu adresu, meno ani text", () => {
    const row = buildMailOutcomeRow({
      agencyId: "a", requestId: "r", eventId: "e", outcome: "not_a_lead",
      reason: "unknown_source", diagnostics, mailboxEvent: "to_agency_mailbox",
    });
    expect(row.sender_domain).toBe("pima.sk");
    expect(row.has_contact_email).toBe(true);
    expect(JSON.stringify(row)).not.toContain("@");
    expect(Object.keys(row).sort()).toEqual([
      "agency_id", "event_id", "event_kind", "has_contact_email", "has_contact_phone",
      "has_listing_ref", "has_message", "mailbox_event", "outcome", "parser_version", "reason",
      "request_id", "sender_domain", "source", "source_detected_by", "source_type",
    ]);
  });
});

describe("recordInboundMailOutcome", () => {
  const row = buildMailOutcomeRow({
    agencyId: "a", requestId: null, eventId: null, outcome: "lead_created",
    reason: null, diagnostics, mailboxEvent: null,
  });
  it("vráti false a nehodí výnimku pri chybe DB", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const supa = { from: () => ({ insert: async () => ({ error: { message: "x" } }) }) };
    expect(await recordInboundMailOutcome(supa as never, row)).toBe(false);
    warn.mockRestore();
  });
  it("vráti false a nehodí výnimku, keď insert vyhodí", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const supa = { from: () => { throw new Error("down"); } };
    expect(await recordInboundMailOutcome(supa as never, row)).toBe(false);
    warn.mockRestore();
  });
  it("vráti true pri úspechu", async () => {
    const supa = { from: () => ({ insert: async () => ({ error: null }) }) };
    expect(await recordInboundMailOutcome(supa as never, row)).toBe(true);
  });
});
